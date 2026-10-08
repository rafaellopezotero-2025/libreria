#!/usr/bin/env bash
# Instalador de la app Librería.
# Requisitos en la máquina destino: Docker con Compose v2.20+ y openssl. Nada más.
# Es re-ejecutable: conserva los secretos existentes, refresca la IP y aplica
# solo las migraciones que falten.
set -euo pipefail
cd "$(dirname "$0")"

SB_DIR="docker/supabase"
SB_ENV="$SB_DIR/.env"
MIGRATIONS_DIR="supabase/migrations"
JWT_YEARS=20

say()  { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

# --- helpers -----------------------------------------------------------------
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

make_jwt() {  # uso: make_jwt anon|service_role   (usa $JWT_SECRET)
  local role="$1" iat exp header payload sig
  iat=$(date +%s); exp=$((iat + JWT_YEARS * 365 * 24 * 3600))
  header=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  payload=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$role" "$iat" "$exp" | b64url)
  sig=$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

get_env() { grep -E "^$1=" "$SB_ENV" 2>/dev/null | head -n1 | cut -d= -f2- || true; }
set_env() {
  if grep -qE "^$1=" "$SB_ENV"; then sed -i "s|^$1=.*|$1=$2|" "$SB_ENV"; else echo "$1=$2" >> "$SB_ENV"; fi
}
dbq() { docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }

# --- 1. requisitos -----------------------------------------------------------
say "Verificando requisitos"
command -v docker  >/dev/null 2>&1 || fail "Docker no está instalado (https://docs.docker.com/engine/install/)."
command -v openssl >/dev/null 2>&1 || fail "Falta openssl (sudo apt install openssl)."
docker info >/dev/null 2>&1 || fail "Este usuario no puede usar Docker. Probá: sudo usermod -aG docker \$USER y volvé a iniciar sesión."
COMPOSE_VER=$(docker compose version --short 2>/dev/null | sed 's/^v//') || true
[ -n "${COMPOSE_VER:-}" ] || fail "Falta el plugin Docker Compose v2."
[ "$(printf '%s\n2.20.0\n' "$COMPOSE_VER" | sort -V | head -n1)" = "2.20.0" ] \
  || fail "Se necesita Docker Compose 2.20 o superior (tenés $COMPOSE_VER)."
[ -d "$MIGRATIONS_DIR" ] || fail "No encuentro la carpeta $MIGRATIONS_DIR."

# --- 2. IP de esta máquina ---------------------------------------------------
# Si detecta mal la interfaz, forzala:  HOST_IP=10.0.0.5 ./install.sh
HOST_IP="${HOST_IP:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
HOST_IP="${HOST_IP:-localhost}"

# --- 3. secretos (solo la primera vez) ---------------------------------------
if [ ! -f "$SB_ENV" ]; then
  say "Generando secretos únicos para esta instalación"
  JWT_SECRET=$(openssl rand -hex 32)
  cat > "$SB_ENV" <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$JWT_SECRET
ANON_KEY=$(make_jwt anon)
SERVICE_ROLE_KEY=$(make_jwt service_role)
PUBLIC_URL=
SITE_URL=
POSTGRES_PORT=5432
API_PORT=8000
STUDIO_PORT=3001
WEB_PORT=8080
EOF
  chmod 600 "$SB_ENV"
else
  say "Se conservan los secretos existentes en $SB_ENV"
fi

for v in POSTGRES_PASSWORD JWT_SECRET ANON_KEY SERVICE_ROLE_KEY; do
  [ -n "$(get_env "$v")" ] || fail "Falta $v en $SB_ENV"
done

API_PORT=$(get_env API_PORT);           API_PORT=${API_PORT:-8000}
STUDIO_PORT=$(get_env STUDIO_PORT);     STUDIO_PORT=${STUDIO_PORT:-3001}
POSTGRES_PORT=$(get_env POSTGRES_PORT); POSTGRES_PORT=${POSTGRES_PORT:-5432}
WEB_PORT=$(get_env WEB_PORT);           WEB_PORT=${WEB_PORT:-8080}

# Lo único que depende de la red: las URLs públicas.
set_env PUBLIC_URL "http://$HOST_IP:$API_PORT"
set_env SITE_URL   "http://$HOST_IP:$WEB_PORT"

# .env raíz: lo usa el frontend en build-time (ANON_KEY es pública por diseño).
cat > .env <<EOF
VITE_SUPABASE_PUBLISHABLE_KEY="$(get_env ANON_KEY)"
VITE_API_PORT=$API_PORT
WEB_PORT=$WEB_PORT
EOF

# --- 4. puertos libres (solo si el sistema todavía no está levantado) --------
if [ -z "$(docker compose ps -q 2>/dev/null)" ]; then
  for p in "$API_PORT" "$STUDIO_PORT" "$POSTGRES_PORT" "$WEB_PORT"; do
    if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$p$"; then
      fail "El puerto $p ya está en uso. Cambialo en $SB_ENV (y borrá nada más) o liberalo."
    fi
  done
fi

# --- 5. levantar todo --------------------------------------------------------
say "Construyendo y levantando los servicios (la primera vez tarda varios minutos)"
docker compose up -d --build

# --- 6. esperar a que GoTrue cree el esquema auth ----------------------------
# Las migraciones usan auth.users / auth.uid(), que crea GoTrue al arrancar,
# por eso se aplican DESPUÉS de levantar y no como script de init de Postgres.
say "Esperando a que la base y la autenticación estén listas"
ready=""
for _ in $(seq 1 90); do
  ready=$(dbq -tA -c "select to_regclass('auth.users') is not null" 2>/dev/null || true)
  [ "$ready" = "t" ] && break
  sleep 2
done
[ "$ready" = "t" ] || fail "El esquema auth no apareció. Revisá: docker compose logs auth db"

# --- 7. preparar y aplicar migraciones ---------------------------------------
say "Preparando la base"
dbq <<'SQL' >/dev/null
create schema if not exists installer;
create table if not exists installer.applied_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

-- Red de seguridad: si GoTrue no definió auth.uid(), se crea (las políticas RLS la usan).
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    create function auth.uid() returns uuid language sql stable as $f$
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      )::uuid
    $f$;
  end if;
end
$$;

-- Permisos estándar de Supabase para las tablas que creen las migraciones.
alter default privileges for role postgres in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
SQL

APPLIED=0
for f in "$MIGRATIONS_DIR"/*.sql; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  if [ -n "$(dbq -tA -c "select 1 from installer.applied_migrations where name = '$name'")" ]; then
    continue
  fi
  say "Aplicando migración $name"
  dbq --single-transaction < "$f" >/dev/null || fail "Falló la migración $name (error arriba)."
  dbq -c "insert into installer.applied_migrations(name) values ('$name')" >/dev/null
  APPLIED=$((APPLIED + 1))
done

dbq -c "grant all on all tables in schema public to anon, authenticated, service_role" >/dev/null
dbq -c "grant all on all sequences in schema public to anon, authenticated, service_role" >/dev/null
# PostgREST cachea el esquema: hay que avisarle que cambió.
dbq -c "notify pgrst, 'reload schema'" >/dev/null
echo "Migraciones aplicadas en esta corrida: $APPLIED"

# --- 8. resumen --------------------------------------------------------------
say "Instalación completa"
echo "  App:      http://$HOST_IP:$WEB_PORT"
echo "  Studio:   http://$HOST_IP:$STUDIO_PORT   (administración de la base, sin login: no exponer fuera del local)"
echo "  Secretos: $SB_ENV   (hacé una copia de seguridad de este archivo)"
