# 🚀 PartyOn — Production Deployment Checklist

This document outlines the vital steps to transition the **PartyOn** platform from a local development environment to a secure, scalable production server.

---

## 🏗️ 1. Infrastructure Recommendation

### **Server: VPS (Virtual Private Server)**
*   **Provider**: Hetzner (Recommended for best performance/price), DigitalOcean, or Linode.
*   **Specs**: Minimum 2-4GB RAM (NodeJS + PostgreSQL + Docker needs some breathing room).
*   **Recommended OS**: Ubuntu 22.04 LTS.

### **Management: Coolify (Self-Hosted PaaS)**
Instead of manual SSH and Nginx configuration, use [Coolify](https://coolify.io/).
*   **Why?**: It acts like a self-hosted Vercel. It manages your Docker containers, handles SSL certificates (HTTPS) automatically via Traefik, and provides a UI for environment variables and backups.

---

## 🔐 2. Security & Environment Variables

### **Environment Variable Management**
*   **NEVER** commit `.env` files with production secrets to Git.
*   Use the **Coolify Environment Variables** tab or your CI/CD secrets manager.

### **Stripe Transition**
*   [ ] Swap `VITE_STRIPE_PUBLIC_KEY` to your `pk_live_...` key.
*   [ ] Swap `STRIPE_SECRET_KEY` to your `sk_live_...` key.
*   [ ] Ensure **Webhooks** are configured in the Stripe Dashboard to point to `https://api.yourdomain.com/api/webhooks` (if implemented).

### **CORS Configuration**
In `backend/src/index.ts`, ensure your CORS policy is locked down:
```typescript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL] // e.g., https://partyon.com
  : ['http://localhost:5173'];
```

---

## 🗄️ 3. Database & Persistence

### **Prisma Migrations**
*   **Dev**: `npx prisma db push` (Destructive, ok for dev).
*   **Production**: `npx prisma migrate deploy`.
*   **Action**: Ensure your deployment script or Dockerfile runs `migrate deploy` to update the schema without losing data.

### **Docker Volumes**
Ensure your `uploads` directory is mapped to a persistent volume so images aren't lost on redeploy:
```yaml
volumes:
  - uploads_data:/app/uploads
```

---

## ⚡ 4. Performance Optimizations

### **Frontend Build**
*   Don't use the Vite dev server (`npm run dev`) in production.
*   Use `npm run build` to generate the `dist/` folder.
*   Serve the `dist/` folder via Nginx or Coolify’s Static Site template.

### **Backend Execution**
*   Run the compiled JavaScript using `node`, not `tsx` or `ts-node`.
*   Example: `node dist/index.js`.

---

## 🌐 5. Networking & Domains

### **Reverse Proxy (SSL/HTTPS)**
*   Your app must run over **HTTPS**. Stripe and modern browsers require it.
*   Coolify handles this automatically. If not using Coolify, use **Nginx Proxy Manager** or **Caddy**.
*   **Mapping**:
    *   `partyon.com` → Routes to Frontend Container (Internal Port 5173).
    *   `api.partyon.com` → Routes to Backend Container (Internal Port 3000).

---

## ✅ 6. Final Deployment Checklist

1. [ ] **VPS Setup**: Server rented and Coolify installed.
2. [ ] **Git Sync**: GitHub repository linked to Coolify.
3. [ ] **Live Keys**: Stripe Live Keys added to environment variables.
4. [ ] **Resend API**: Real Resend API key added for email tickets.
5. [ ] **Volume Mounts**: Verified `/app/uploads` is persistent.
6. [ ] **Domain Verification**: Add `partyon.com` to Stripe's "Authorized Domains" (Settings > Payment Methods > Apple Pay).
7. [ ] **Health Check**: Visit `https://api.yourdomain.com/health` after deploy.

---

> [!TIP]
> **Pro-Tip**: Use **Cloudflare** as your DNS provider. It provides an extra layer of DDoS protection and CDN caching for your event images for free.
