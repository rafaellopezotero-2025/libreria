# ---------- Etapa 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Solo la anon key y el puerto de la API se fijan en build-time.
# La IP/host NO: client.ts la calcula en el navegador con window.location.hostname,
# así la misma imagen sirve en cualquier red.
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_PORT=8000
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_API_PORT=$VITE_API_PORT

RUN npm run build

# ---------- Etapa 2: producción ----------
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
