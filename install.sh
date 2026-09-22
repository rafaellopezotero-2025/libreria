#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "  Instalador - App Librería (Supabase local + App)"
echo "=================================================="
echo ""

# ---------- 1. Chequeos previos ----------
command -v docker >/dev/null 2>&1 || {
  echo "❌ Docker no está instalado. Instalalo antes de continuar:"
  echo "   https://docs.docker.com/engine/install/"
  exit 1
}

docker compose version >/dev/null 2>&1 || {
  echo "❌ Docker Compose (plugin) no está disponible. Verificá tu instalación de Docker."
  exit 1
}

command -v supabase >/dev/null 2>&1 || {
  echo "❌ Supabase CLI no está instalado. Instalalo:"
  echo "   https://supabase.com/docs/guides/cli/getting-started"
  exit 1
}

echo "✅ Docker y Supabase CLI encontrados."
echo ""

# ---------- 2. Levantar Supabase local ----------
echo "-> Levantando Supabase local (puede tardar varios minutos la primera vez)..."
supabase start

echo ""
echo "-> Aplicando migraciones (por si la base ya existía sin ellas)..."
supabase db push --include-all || true

# ---------- 3. Extraer credenciales generadas ----------
echo ""
echo "-> Extrayendo credenciales locales generadas..."

if command -v jq >/dev/null 2>&1; then
  STATUS_JSON=$(supabase status -o json)
  ANON_KEY=$(echo "$STATUS_JSON" | jq -r '.ANON_KEY // .anon_key // empty')
else
  echo "⚠️  'jq' no está instalado, usando extracción por texto (menos robusta)."
  echo "    Se recomienda instalar jq: sudo apt install jq"
  ANON_KEY=$(supabase status | grep -i "anon key" | awk '{print $NF}')
fi

if [ -z "${ANON_KEY:-}" ]; then
  echo "❌ No se pudo extraer la ANON_KEY automáticamente."
  echo "   Corré 'supabase status' manualmente, copiá la 'anon key' y pegala en .env"
  echo "   en la variable VITE_SUPABASE_PUBLISHABLE_KEY."
  exit 1
fi

echo "✅ Credenciales obtenidas."

# ---------- 4. Generar .env del frontend ----------
echo ""
echo "-> Generando .env del frontend..."
cat > .env <<EOF
VITE_SUPABASE_PUBLISHABLE_KEY="${ANON_KEY}"
# VITE_SUPABASE_URL se calcula dinámicamente en el navegador (client.ts);
# no se define acá a propósito para que funcione en cualquier red sin rebuild.
EOF

echo "✅ .env generado."

# ---------- 5. Build y levantamiento del frontend ----------
echo ""
echo "-> Construyendo y levantando el frontend (esto puede tardar unos minutos)..."
docker compose up -d --build

# ---------- 6. Mensaje final ----------
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
IP=${IP:-localhost}

echo ""
echo "=================================================="
echo "  ✅ Instalación completa"
echo ""
echo "  Abrí en el navegador: http://${IP}:8080"
echo "=================================================="
