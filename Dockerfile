# ---------- Etapa 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Instalar dependencias primero (aprovecha cache de Docker si no cambia package.json)
COPY package*.json ./
RUN npm ci

# Copiar el resto del código
COPY . .

# La anon key SÍ se necesita en build-time (Vite la inyecta como constante en el bundle).
# La URL de Supabase NO se pasa acá: se calcula dinámicamente en el navegador
# (ver src/integrations/supabase/client.ts), así esta imagen sirve para cualquier
# servidor/red sin reconstruir.
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

# ---------- Etapa 2: producción ----------
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
