# 🚀 Guía de Despliegue — PartyOn Web
> Servidor: Hetzner VPS | Stack: Docker + Caddy + PostgreSQL

Este documento cubre todo lo necesario para desplegar `PartyOn_web` en producción,
conviviendo con `PartyOn_Gamification` en el mismo servidor.

---

## 🗺️ Arquitectura en el servidor

```
Servidor Hetzner
│
├── ~/caddy-proxy/              ← UN solo Caddy para todo el servidor
│   ├── docker-compose.yml
│   └── Caddyfile               ← Ambos dominios configurados aquí
│
├── ~/PartyOn_Gamification/     ← SIN Caddy propio en producción
│   └── docker-compose.prod.yml
│
└── ~/PartyOn_web/              ← SIN Caddy propio en producción
    └── docker-compose.prod.yml
```

**Flujo de tráfico:**
```
Internet :443
    │
    ▼
[ Caddy compartido ] ← gestiona SSL automáticamente (Let's Encrypt)
    │
    ├─ gamification.tudominio.com → gami_frontend:80 / gami_backend:3000
    └─ partyon.tudominio.com      → web_frontend:80  / web_backend:3000
```

> [!IMPORTANT]
> Cada proyecto tiene su propio Caddy en desarrollo local, pero en producción
> **solo existe UN Caddy** para evitar conflictos en los puertos 80/443.

---

## 📋 Pre-requisitos (hacer UNA sola vez en el servidor)

### 1. Verificar que Docker está instalado
```bash
docker --version
docker compose version
```

### 2. Crear la red Docker compartida
Esta red conecta el Caddy con los contenedores de ambos proyectos:
```bash
docker network create caddy_net
```

### 3. Apuntar los dominios al servidor
En tu gestor DNS (Cloudflare, etc.), crea registros tipo A:

| Subdominio | Tipo | Valor |
|---|---|---|
| `partyon.tudominio.com` | A | IP del servidor Hetzner |
| `gamification.tudominio.com` | A | IP del servidor Hetzner |

> Espera ~5 minutos a que propague antes de lanzar Caddy.

---

## 🔧 Paso 1 — Configurar el Caddy compartido

Crear la carpeta en el servidor:
```bash
mkdir ~/caddy-proxy && cd ~/caddy-proxy
```

### `~/caddy-proxy/Caddyfile`
```caddy
{
    email admin@tudominio.com   # ← cambia esto
}

# ── Proyecto de Gamificación ─────────────────────────────────────────────────
gamification.tudominio.com {
    handle /api/* {
        reverse_proxy gami_backend:3000
    }
    handle {
        reverse_proxy gami_frontend:80
    }
    header {
        Permissions-Policy "interest-cohort=()"
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    }
}

# ── PartyOn Web (venta de entradas + validación) ──────────────────────────────
partyon.tudominio.com {
    handle /api/* {
        reverse_proxy web_backend:3000
    }
    handle {
        reverse_proxy web_frontend:80
    }
    header {
        Permissions-Policy "interest-cohort=()"
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    }
}
```

### `~/caddy-proxy/docker-compose.yml`
```yaml
services:
  caddy:
    image: caddy:2.9-alpine
    container_name: caddy_proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"   # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - caddy_net

volumes:
  caddy_data:
  caddy_config:

networks:
  caddy_net:
    external: true   # La red que creamos con docker network create
```

### Arrancar Caddy:
```bash
cd ~/caddy-proxy
docker compose up -d
docker compose logs -f   # verificar que arranca sin errores
```

---

## 🔧 Paso 2 — Crear docker-compose.prod.yml para PartyOn_web

Este fichero reemplaza al `docker-compose.yml` en producción.
Las diferencias clave con el fichero de desarrollo:
- ❌ Sin Caddy propio
- ❌ Sin puertos expuestos al exterior (80, 443, 3000)
- ✅ Conectado a `caddy_net` con nombres de contenedor únicos (`web_*`)
- ✅ Usa `prisma migrate deploy` en lugar de `db push --accept-data-loss`

```yaml
# docker-compose.prod.yml
services:
  db:
    image: postgres:15-alpine
    container_name: web_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - web_pgdata:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: web_backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
      - PORT=3000
      - JWT_SECRET=${JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - FRONTEND_URL=https://partyon.tudominio.com
      - BACKEND_URL=https://partyon.tudominio.com
    volumes:
      - web_uploads:/app/uploads
    networks:
      - internal
      - caddy_net        # visible para Caddy con nombre web_backend
    depends_on:
      db:
        condition: service_healthy
    command: >
      sh -c "npx prisma migrate deploy &&
             node dist/index.js"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE: https://partyon.tudominio.com/api
        VITE_STRIPE_PUBLIC_KEY: ${VITE_STRIPE_PUBLIC_KEY}
    container_name: web_frontend
    restart: unless-stopped
    networks:
      - caddy_net        # visible para Caddy con nombre web_frontend
    depends_on:
      - backend

volumes:
  web_pgdata:
  web_uploads:

networks:
  internal:              # red privada entre db, backend
  caddy_net:
    external: true       # red compartida con Caddy
```

---

## 🔧 Paso 3 — Variables de entorno para producción

Crear el fichero `.env.production` en el servidor (NO subir a git):

```env
# ── Base de datos ─────────────────────────────────────────────────────────────
POSTGRES_USER=partyon_admin
POSTGRES_PASSWORD=CAMBIA_ESTO_POR_ALGO_SEGURO
POSTGRES_DB=partyon_prod

# ── Auth ──────────────────────────────────────────────────────────────────────
# Generar con: openssl rand -base64 64
JWT_SECRET=GENERA_UN_SECRET_LARGO_Y_ALEATORIO

# ── Stripe LIVE ───────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# ── Email (Resend con dominio propio) ─────────────────────────────────────────
RESEND_API_KEY=re_...
```

> [!CAUTION]
> Nunca uses las claves `sk_test_` en producción. Cambia a `sk_live_` antes del evento.
> El email `from:` en `email.service.ts` debe cambiarse a tu dominio verificado en Resend.

---

## 🔧 Paso 4 — Preparar el backend para migraciones

> [!WARNING]
> El `docker-compose.yml` de desarrollo usa `prisma db push --accept-data-loss`.
> En producción esto puede **borrar datos**. El `docker-compose.prod.yml` usa
> `prisma migrate deploy` que es seguro y auditado.

Antes del primer deploy, asegúrate de que existe la carpeta de migraciones:
```bash
# En tu máquina local, dentro de backend/
npx prisma migrate dev --name init
# Esto genera backend/prisma/migrations/ — commitea esto a git
```

---

## 🔧 Paso 5 — Verificar email en Resend

1. Ve a [resend.com/domains](https://resend.com/domains)
2. Añade tu dominio (ej. `partyon.pt`)
3. Añade los registros DNS que Resend te indique (SPF, DKIM, DMARC)
4. Espera verificación (~5 min)
5. En `backend/src/services/email.service.ts`, cambia:
   ```ts
   // ANTES (solo funciona en test):
   from: 'PartyOn Tickets <onboarding@resend.dev>'
   
   // DESPUÉS (dominio verificado):
   from: 'PartyOn Tickets <tickets@partyon.pt>'
   ```

---

## 🚀 Deploy completo (comandos en el servidor)

```bash
# 1. Clonar/actualizar el repositorio
cd ~
git clone <repo-url> PartyOn_web
cd PartyOn_web

# 2. Copiar el fichero de variables de entorno
cp .env.production .env   # o crear el .env directamente

# 3. Construir y arrancar los contenedores
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# 4. Verificar que todo está corriendo
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend --tail=50

# 5. Crear el primer usuario admin
docker compose -f docker-compose.prod.yml exec backend node dist/scripts/create_user.js
# (o usar Prisma Studio si está accesible)
```

---

## 🔄 Actualizar en producción (re-deploy)

```bash
cd ~/PartyOn_web
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

> Caddy y la BD NO se reinician a menos que sus configuraciones cambien.

---

## ✅ Checklist final antes del evento

### Infraestructura
```
[ ] DNS apuntando al servidor (partyon.tudominio.com → IP Hetzner)
[ ] Red Docker caddy_net creada: docker network create caddy_net
[ ] Caddy compartido arrancado y con SSL activo (verificar en el navegador)
[ ] Ambos proyectos corriendo: docker compose ps en cada uno
```

### Seguridad
```
[ ] JWT_SECRET generado con: openssl rand -base64 64
[ ] Contraseña de BD cambiada (no usar 'adminpassword')
[ ] Claves Stripe en modo LIVE (sk_live_... / pk_live_...)
[ ] Email from: cambiado a dominio verificado en Resend
[ ] FRONTEND_URL configurada en backend .env (para CORS)
```

### Funcional
```
[ ] Hacer un pago de prueba real (1€) y verificar que llega el email con el PDF
[ ] Imprimir o mostrar el QR del ticket de prueba y escanearlo con el Scanner
[ ] Registrar una venta en puerta (EFECTIVO + MBWAY)
[ ] Verificar que los gastos aparecen en el Management Dashboard
[ ] Comprobar que el DevDashboard muestra logs en tiempo real
[ ] Verificar que el login de STAFF solo da acceso al Scanner
```

### Pendiente antes de estar al 100%
```
[ ] Implementar Stripe Webhook (payment_intent.succeeded)
       → Sin esto, pagos con el navegador cerrado no generan entrada
[ ] Añadir rate limiting en /auth/login y /checkout
[ ] Crear usuarios STAFF desde la UI (ahora solo vía script/Prisma Studio)
[ ] Implementar formulario de registro de gastos en Management Dashboard
```

---

## 🛠️ Comandos útiles en el servidor

```bash
# Ver logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f backend

# Entrar al contenedor del backend
docker compose -f docker-compose.prod.yml exec backend sh

# Ver el estado de la base de datos (desde el backend)
docker compose -f docker-compose.prod.yml exec backend npx prisma studio
# (ojo: Prisma Studio en producción solo si hay un túnel seguro)

# Reiniciar solo el backend (sin reconstruir)
docker compose -f docker-compose.prod.yml restart backend

# Forzar rebuild del frontend (por ejemplo, si cambiaste VITE_API_BASE)
docker compose -f docker-compose.prod.yml up -d --build frontend

# Ver uso de recursos
docker stats

# Recargar Caddy después de cambiar el Caddyfile
cd ~/caddy-proxy
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 🔑 Crear usuarios (hasta que exista la UI)

```bash
# En el servidor, ejecutar el script de creación de usuario:
docker compose -f docker-compose.prod.yml exec backend \
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    async function main() {
      const hash = await bcrypt.hash('TU_PASSWORD_AQUI', 10);
      const user = await prisma.user.create({
        data: { email: 'admin@partyon.pt', password: hash, name: 'Admin', role: 'ADMIN' }
      });
      console.log('Usuario creado:', user.email, user.role);
      await prisma.\$disconnect();
    }
    main().catch(console.error);
  "
```

Roles disponibles: `ADMIN` | `STAFF` | `DEV`
