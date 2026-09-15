# Base de datos local (sin depender de la nube)

Objetivo: que las ventas, el stock y la caja se guarden en un servidor propio dentro del local,
para que el sistema siga funcionando aunque no haya internet.

## Cómo se resuelve

El sistema usa base de datos, usuarios/contraseñas y reglas de permisos que hoy viven en la nube.
Todo ese conjunto se puede instalar en la misma máquina Ubuntu con la versión autoalojada
(se instala con Docker, en un solo paso guiado). Así el sistema no cambia por dentro:
solo apunta a la base local en vez de la remota.

Ventajas: funciona sin internet, los datos quedan en el local.
A tener en cuenta: la máquina del local pasa a ser responsable de los respaldos, y la versión de
prueba dentro de Lovable seguirá usando la nube (son dos entornos separados).

## Qué voy a preparar

1. Un archivo de instalación con Docker que levanta la base de datos, el sistema de usuarios y la
   capa de datos en la máquina Ubuntu, con contraseñas propias.
2. Un guion que carga la estructura completa (tablas, permisos, funciones y datos iniciales) en la
   base local, tomada de las 4 migraciones que ya tiene el proyecto.
3. Ajuste de configuración para que, al compilar en Ubuntu, el sistema apunte a la base local
   (dirección del servidor y su clave), sin tocar el funcionamiento actual en la nube.
4. Una guía nueva en español, paso a paso: instalar Docker, levantar la base, crear el primer
   usuario administrador, respaldos automáticos diarios y restauración.
5. Un apartado extra en la guía de Ubuntu existente explicando cuándo conviene la base local y
   cuándo la de la nube.

## Detalles técnicos

- `docker/supabase/docker-compose.yml`: Postgres 17, GoTrue (auth), PostgREST, Kong y Studio,
  con `.env.local-db` para claves JWT/anon/service.
- `scripts/init-local-db.sh`: aplica en orden `supabase/migrations/*.sql` sobre la base local
  vía `psql`, idempotente.
- `scripts/backup-local-db.sh` + entrada de cron: `pg_dump` diario comprimido con rotación de 14 días.
- La app lee `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, así que apuntar a local es solo
  cambiar `.env` antes del build; no se modifica `src/integrations/supabase/*`.
- Documentación: `base-de-datos-local.md` (nueva) y sección añadida en `instalacion-ubuntu.md`.
