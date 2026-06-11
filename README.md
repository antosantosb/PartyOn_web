# 🎉 PartyOn — Event ERP & Ticketing Platform

**PartyOn** is a self-hosted, end-to-end event management and ticket sales platform. Built for independent event promoters who need full control over their branding, ticketing, and financial intelligence — with zero third-party commissions.

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      FRONTEND (Vite + React)              │
│  ┌─────────────────┐    ┌──────────────────────────────┐  │
│  │  Storefront /   │    │   Admin Panel /admin         │  │
│  │  Customer-facing│    │   (Config · Management ·     │  │
│  │  ticket shop    │    │    Validation · DevTools)    │  │
│  └────────┬────────┘    └──────────────┬───────────────┘  │
└───────────┼─────────────────────────────┼─────────────────┘
            │  REST API + JWT Auth         │
┌───────────▼─────────────────────────────▼─────────────────┐
│                   BACKEND (Express + TypeScript)           │
│  Controllers: admin · auth · checkout · ticketType · dev  │
│  Services:    Stripe · Resend · React-PDF · QR Code       │
│  Middleware:  JWT Auth · RBAC (ADMIN / STAFF / DEV)       │
└───────────────────────────────┬───────────────────────────┘
                                │
              ┌─────────────────▼──────────────────┐
              │    PostgreSQL + Prisma ORM          │
              │  Models: Event · TicketType ·       │
              │  Ticket · Order · Theme ·           │
              │  GalleryImage · Expense · AuditLog  │
              └────────────────────────────────────┘
```

---

## ✅ Feature Status

### Customer Storefront
| Feature | Status |
|---|---|
| Event landing page (dynamic branding, gallery, lineup) | ✅ Done |
| Stripe checkout with PaymentElement (2-step flow) | ✅ Done |
| GDPR-compliant marketing consent checkbox (unbundled) | ✅ Done |
| PDF ticket generation with branded QR code | ✅ Done |
| Automated email delivery via Resend | ✅ Done |
| Mobile-responsive layout | ✅ Done |
| Newsletter subscription section | 🟡 UI only (no backend storage) |

### Admin Panel
| Feature | Status |
|---|---|
| Event configuration (info, dates, theme, branding) | ✅ Done |
| Ticket type management (pricing, stock, sale windows) | ✅ Done |
| Background image upload (desktop + mobile) | ✅ Done |
| QR Scanner for ticket validation | ✅ Done |
| Walk-in door sale (cash / MBWay) | ✅ Done |
| Management dashboard (revenue, expenses chart) | ✅ Done |
| Export global marketing emails list (CSV) | ✅ Done |
| Expense entry (create/delete) | 🔴 Missing |
| User management (CRUD for staff/admin) | 🔴 Missing |
| Gallery image management (upload + reorder) | 🔴 Partial |
| Password recovery flow | 🔴 Missing |

### Backend / Infrastructure
| Feature | Status |
|---|---|
| JWT authentication with bcrypt | ✅ Done |
| RBAC middleware (ADMIN, STAFF, DEV roles) | ✅ Done |
| Atomic checkout transactions (race condition safe) | ✅ Done |
| Stripe payment server-side verification | ✅ Done |
| Full audit log system | ✅ Done |
| Dev dashboard (DB stats, live logs, ticket search) | ✅ Done |
| Docker + Docker Compose deployment | ✅ Done |
| Shared Zod schemas (monorepo) | ✅ Done |
| Stripe webhook handler | 🔴 Missing (critical) |
| API rate limiting | 🔴 Missing |
| Database backups | 🔴 Missing |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL 15, Prisma ORM v5 |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Payments** | Stripe (PaymentIntents + PaymentElement) |
| **Email** | Resend |
| **PDF** | @react-pdf/renderer |
| **QR** | qrcode (canvas-based, server-side) |
| **QR Scanner** | @zxing/browser |
| **Timezones** | date-fns-tz (strict Europe/Lisbon) |
| **Validation** | Zod (shared `@partyon/schemas` package) |
| **Infrastructure** | Docker, Docker Compose |

---

## 👤 User Roles

| Role | Access |
|---|---|
| `ADMIN` | Full admin panel: Configuration, Management, Validation |
| `STAFF` | Validation scanner + Walk-in sales only |
| `DEV` | All of the above + Dev tools (DB stats, audit logs, ticket search) |

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- A [Stripe](https://stripe.com) account (test or live)
- A [Resend](https://resend.com) account (for email delivery)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd PartyOn_web
```

Create a `.env` file at the project root:
```env
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://admin:adminpassword@localhost:5432/partyon?schema=public
JWT_SECRET=your-very-long-random-secret-minimum-64-chars
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

Create `frontend/.env`:
```env
VITE_API_BASE=http://localhost:3000/api
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### 2. Launch with Docker

```bash
docker-compose up -d --build
```

This will:
1. Start a PostgreSQL 15 database
2. Run `prisma db push` to sync the schema
3. Run the database seed (creates a default event)
4. Start the Express backend on port 3000

### 3. Start the Frontend (Development)

```bash
cd frontend
npm install
npm run dev
```

### 4. Access Points

| Service | URL |
|---|---|
| **Storefront** | http://localhost:5173 |
| **Admin Panel** | http://localhost:5173/admin |
| **Backend API** | http://localhost:3000/api |
| **Health Check** | http://localhost:3000/health |
| **Prisma Studio** | `npx prisma studio` (inside `/backend`) |

### 5. Create Your First Admin User

Since there is no user management UI yet, create users via the seed or Prisma Studio:

```bash
cd backend
npx ts-node src/scripts/create-user.ts
# Or use Prisma Studio to manually create a User record
# Remember to hash the password with bcrypt (cost factor 10)
```

---

## 📁 Project Structure

```
PartyOn_web/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # All DB models
│   │   └── seed.ts
│   └── src/
│       ├── controllers/        # admin · auth · checkout · ticketType · dev
│       ├── middleware/         # auth.middleware (JWT + RBAC)
│       ├── routes/             # api.route.ts (single router)
│       ├── services/           # stripe · email · pdf · qr
│       └── index.ts            # Express app entry point
├── frontend/
│   └── src/
│       ├── components/         # StripeCheckout · ProtectedRoute · layout · ui
│       ├── pages/
│       │   ├── Customer.tsx    # Storefront
│       │   ├── Login.tsx
│       │   └── admin/          # Configuration · Management · Validation · Dev
│       ├── lib/
│       │   ├── api-client.ts   # Centralized fetch with JWT injection
│       │   └── store.ts        # useStore() — event data + localStorage cache
│       └── config/
│           └── api.ts
└── packages/
    └── schemas/                # Shared Zod schemas (@partyon/schemas)
```

---

## 🔜 Roadmap (Next Development Phase)

### Critical (Pre-Production Blockers)
- [ ] **Stripe Webhook** — `payment_intent.succeeded` handler to guarantee ticket delivery even if the browser closes after payment
- [ ] **API Rate Limiting** — Protect `/auth/login`, `/checkout`, and `/create-payment-intent` against brute-force and spam
- [ ] **Production email domain** — Replace `onboarding@resend.dev` with verified custom domain
- [ ] **HTTPS + reverse proxy** — Nginx/Caddy with TLS in front of the backend

### High Priority (Business Logic)
- [ ] **User Management UI** — Create/delete admin and staff accounts from the panel
- [ ] **Expense CRUD** — Form to register and delete operational expenses per event
- [ ] **Password Recovery** — `/auth/forgot-password` + `/auth/reset-password` with time-limited tokens
- [ ] **Newsletter Storage** — Save subscriber emails to a `Subscriber` model

### Phase 2 (V2 Features)
- [ ] **Discount Codes** — Percentage or fixed-amount coupon system
- [ ] **Real-time Scan Feed** — Entry rate chart for promoters during the event
- [ ] **Database Backups** — Automated `pg_dump` with off-site storage
- [ ] **Gallery Image Manager** — Drag-and-drop upload/reorder in the backoffice

> See [PROJECT_BACKLOG.md](./PROJECT_BACKLOG.md) for the full detailed task list.

---

## ⚙️ Pre-Production Checklist

```
[ ] Stripe LIVE keys configured and tested with a real payment
[ ] Custom email domain verified in Resend
[ ] HTTPS active on backend (required for Stripe webhooks)
[ ] JWT_SECRET is a cryptographically random 64+ char string
[ ] CORS restricted to FRONTEND_URL production domain
[ ] Rate limiting active on auth and payment endpoints
[ ] Stripe webhook endpoint registered and signature verified
[ ] Admin and staff users created with secure passwords
[ ] Default database credentials changed (not 'adminpassword')
[ ] Database backup strategy in place before the event
[ ] Full purchase flow tested end-to-end in production
[ ] QR scanner tested with a real printed ticket
[ ] Walk-in sale tested with both payment methods
[ ] Confirmation emails verified (check spam folder)
```

---

> [!TIP]
> **Timezone**: This platform is strictly configured for **Europe/Lisbon** timezone. All datetime inputs are interpreted in this zone server-side via `date-fns-tz`. Ensure your host system clock is synced (NTP).

> [!WARNING]
> **Stripe Webhook**: Until the webhook handler is implemented, there is a risk that paid orders may not generate tickets if the user's browser closes between Stripe confirming the payment and the frontend calling `/checkout`. Prioritize this before any live event.
