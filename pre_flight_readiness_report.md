# PartyOn: Pre-Flight Readiness Review 🚀

Here is the comprehensive architectural and readiness review of the **PartyOn Multi-Event ERP** platform, specifically analyzed for your Vercel (Frontend) and Hetzner VPS / Coolify (Backend/DB) deployment strategy.

---

## 1. Current System State (What is working right now)

The core architecture is solid and well-structured, successfully separating concerns between the presentation layer and the business logic layer.

*   **Frontend (React + Vite + Tailwind + React Router):** 
    *   **Routing:** Successfully implements a split layout. Public routes (`/` for customer checkout, `/login`) and protected Admin routes wrapped in an `<AdminLayout>` (`/admin/configuration`, `/admin/dev`, `/admin/validation`, `/admin/management`).
    *   **Integrations:** Stripe SDK is properly configured for the frontend payment element.
*   **Backend (Node.js + Express + TypeScript):**
    *   **API Endpoints:** Functional REST API covering authentication, checkout workflows (2-step Stripe PaymentIntent process), admin actions (event CRUD, store data updates), and ticket validation for the scanner.
    *   **Services:** Well-abstracted services for Stripe (`stripe.service.ts`), QR generation (`qr.service.ts`), PDF generation (`pdf.service.ts`), and Email (`email.service.ts`).
*   **Database (PostgreSQL + Prisma):**
    *   **Schema:** The `schema.prisma` is production-ready. It includes proper relational integrity between `Event`, `Theme`, `TicketType`, `Ticket`, and `Expense`. It correctly utilizes UUIDs/CUIDs, sensible defaults, and an `AuditLog` table for tracking system events.

---

## 2. Technical Debt & Improvements (What needs to improve)

Before you hit "Deploy", there are a few structural fragility points that need addressing.

### Hardcoded Values (Critical)
*   **Image Upload URL (`backend/src/routes/api.route.ts`):** 
    *   Currently, the image upload endpoint returns: `const publicUrl = \`http://localhost:${process.env.PORT || 3000}/uploads/${req.file.filename}\`;`. 
    *   **The Risk:** When deployed, images will try to load from the user's `localhost` instead of your Hetzner VPS. 
    *   **The Fix:** This must be changed to use an environment variable like `process.env.BACKEND_URL` (e.g., `https://api.yourdomain.com`).

### Anti-Patterns & Fragility
*   **CPU-Blocking PDF Generation:** In `checkout.controller.ts`, the asynchronous ticket delivery system generates PDFs inside a `for...of` loop using `@react-pdf/renderer` (`renderToBuffer`). Since Node.js is single-threaded, generating 10 PDFs in a row for a large order could temporarily block the event loop, slowing down other incoming requests.
    *   *Improvement:* While it runs in the background (which is good), for large-scale production, this should ideally be pushed to a queue (like Redis/BullMQ) or handled by serverless functions. For V1, it is acceptable, but monitor VPS CPU usage.
*   **Missing Try/Catch Edge Cases:** Your major controllers (`checkout.controller.ts`, `admin.controller.ts`) are well wrapped in `try/catch` blocks and use Prisma `$transaction` safely. However, the image upload route (`/upload-image`) relies entirely on Multer catching file errors. If the file system throws an unexpected error, it could result in an unhandled promise rejection.
*   **React Complexity:** Your `Configuration.tsx` is over 380+ lines long, handling Event Data, Theme Settings, and Ticket Types all at once. It should be refactored into smaller sub-components (`<ThemeSettings />`, `<TicketTypesTable />`, etc.) for easier maintenance in the future.

---

## 3. VPS & Infrastructure Readiness (Is it ready to deploy?)

Overall, the infrastructure setup is very close to production-ready, but requires specific environment configurations.

### CORS Configuration
*   **Status: GOOD.** Your Express backend (`index.ts`) is configured to accept requests from `process.env.FRONTEND_URL`. 
*   **Action Required:** You must ensure `FRONTEND_URL` is set exactly to your Vercel production domain (e.g., `https://partyon.vercel.app`) with no trailing slash.

### Docker & File Storage
*   **Status: EXCELLENT.** 
*   **PDF Storage:** Your PDF service (`pdf.service.ts`) uses `renderToBuffer()`. **It does not write to the file system at all.** It holds the PDF in memory and sends it directly via Resend. This is incredibly safe for Linux containers and serverless environments.
*   **Image Uploads:** Multer correctly saves images to `/app/uploads` inside the container, and your `docker-compose.yml` mounts a persistent volume `uploads_data:/app/uploads`. This ensures image persistence if the container restarts.
*   **Dockerfile:** Uses multi-stage builds, successfully separating the build environment (with TypeScript/Prisma generation) from the lightweight runtime environment (`node:20-slim`).

### Environment Variables Cheat Sheet
You will need to configure these explicitly:

**Hetzner VPS (Backend `.env`):**
*   `DATABASE_URL` (Points to your Postgres container, e.g., `postgresql://admin:adminpassword@db:5432/partyon?schema=public`)
*   `PORT` (Usually `3000`)
*   `STRIPE_SECRET_KEY` (Your live Stripe key: `sk_live_...`)
*   `RESEND_API_KEY` (Your live Resend key)
*   `FRONTEND_URL` (The Vercel domain: `https://your-frontend.vercel.app`)
*   `BACKEND_URL` (**Needs to be added to code**: The Hetzner domain for serving images: `https://api.yourdomain.com`)
*   `JWT_SECRET` (Ensure you have a strong secret for your `authMiddleware`)

**Vercel (Frontend `.env`):**
*   `VITE_API_URL` (Your Hetzner backend domain: `https://api.yourdomain.com/api`)
*   `VITE_STRIPE_PUBLIC_KEY` (Your live Stripe public key: `pk_live_...`)

---

## 4. The Final Action Plan (What to do before deploy)

Here is your prioritized, step-by-step checklist to execute before pointing DNS and going live:

### Phase 1: Code Fixes (Do this locally first)
1.  **Fix Image URL Hardcode:** In `backend/src/routes/api.route.ts`, change the `publicUrl` to use an environment variable:
    ```javascript
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const publicUrl = `${backendUrl}/uploads/${req.file.filename}`;
    ```
2.  **Verify JWT Secret:** Check how `jsonwebtoken` is configured in your `auth.controller.ts` and ensure it uses a `process.env.JWT_SECRET` rather than a hardcoded string.
3.  **Clean up Frontend API Calls:** Ensure all API calls in the frontend utilize `API_BASE` from `src/config/api.ts` rather than hardcoded `http://localhost`.

### Phase 2: VPS Setup (Hetzner / Coolify)
1.  **Provision Server:** Rent the Hetzner server and install Docker/Coolify.
2.  **Environment Variables:** Add the Backend `.env` list (from section 3) to your Coolify environment secrets.
3.  **Deploy Backend & DB:** Push your code or connect your repo to Coolify. Let it build the `docker-compose.yml`.
4.  **Run Migrations:** Once the DB is up, you **must** run `npx prisma migrate deploy` (or `db push` if using plain schema sync) inside the backend container to build the SQL tables. Without this, the backend will crash on the first query.

### Phase 3: Frontend Setup (Vercel)
1.  **Connect Repo:** Link your GitHub repo to Vercel.
2.  **Set Build Command:** Ensure it's set to `npm run build` and the Output Directory is `dist`.
3.  **Environment Variables:** Add `VITE_API_URL` (pointing to your newly live Hetzner backend) and `VITE_STRIPE_PUBLIC_KEY` to Vercel's environment variables dashboard.
4.  **Deploy & Test:** Trigger the Vercel deploy.

### Phase 4: Production Verification
1.  **CORS Test:** Attempt to log in from the Vercel domain. If it fails, check the `FRONTEND_URL` variable on the backend.
2.  **Upload Test:** Upload a theme background image in the Admin Configuration panel to verify the volume mount and new `BACKEND_URL` work correctly.
3.  **End-to-End Payment Test:** Do a real $1 transaction (or use Stripe Test Mode keys first) to verify Webhooks/PaymentIntents, PDF Generation, and Email delivery via Resend all work on the Linux architecture.
