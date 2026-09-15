#!/usr/bin/env bash
# Carga la estructura completa del sistema (tablas, permisos, funciones y datos iniciales)
# en la base de datos local. Se puede volver a ejecutar sin problema: recuerda lo ya aplicado.
# Uso:  bash scripts/init-local-db.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$DIR/docker/supabase/.env"
CONTAINER="libreria-db"

[ -f "$ENV_FILE" ] || { echo "Falta $ENV_FILE. Ejecutá antes: bash scripts/generar-claves.sh"; exit 1; }
set -a; . "$ENV_FILE"; set +a

psql_run() { docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }

echo "Esperando la base de datos..."
for i in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres -d postgres >/dev/null 2>&1 && break
  sleep 2
done

echo "Ajustando contraseñas internas..."
psql_run -c "ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';" \
         -c "ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';" >/dev/null

echo "Esperando el servicio de usuarios (crea la tabla de cuentas)..."
for i in $(seq 1 60); do
  if psql_run -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='users';" | grep -q 1; then
    break
  fi
  sleep 2
done

echo "Registro de migraciones..."
psql_run -c "CREATE TABLE IF NOT EXISTS public._migraciones_aplicadas (archivo text PRIMARY KEY, aplicada_at timestamptz NOT NULL DEFAULT now());" >/dev/null

for f in "$DIR"/supabase/migrations/*.sql; do
  name="$(basename "$f")"
  if psql_run -tAc "SELECT 1 FROM public._migraciones_aplicadas WHERE archivo='$name';" | grep -q 1; then
    echo "  - $name (ya estaba aplicada)"
    continue
  fi
  echo "  - aplicando $name"
  psql_run < "$f"
  psql_run -c "INSERT INTO public._migraciones_aplicadas (archivo) VALUES ('$name');" >/dev/null
done

echo
echo "Base local lista. El primer usuario que se registre en el sistema queda como administrador."
