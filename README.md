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
│  │  ticket shop    │    │    Validation · Users · Dev) │  │
│  └────────┬────────┘    └──────────────┬───────────────┘  │
└───────────┼─────────────────────────────┼─────────────────┘
            │  REST API + JWT Auth         │
┌───────────▼─────────────────────────────▼─────────────────┐
│                   BACKEND (Express + TypeScript)           │
│  Controllers: admin · auth · checkout · ticketType ·      │
│               dev · expense · export · user · webhook     │
│  Services:    Stripe · Resend · React-PDF · QR Code       │
│  Middleware:  JWT Auth · RBAC (ADMIN / STAFF / DEV) ·     │
│               Rate Limiting (login / payment / checkout)  │
└───────────────────────────────┬───────────────────────────┘
                                │
              ┌─────────────────▼──────────────────┐
              │    PostgreSQL + Prisma ORM          │
              │  Models: Event · TicketType ·       │
              │  Ticket · Order · Theme ·           │
              │  GalleryImage · Expense · AuditLog  │
              │  User · (Promoter · DiscountCode*)  │
              └────────────────────────────────────┘
```

> *Promoter & DiscountCode models are planned for the next development phase.

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
| i18n (Español / Português) | 🔴 Planned |
| Discount code field at checkout | 🔴 Planned |

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
| Expense entry (create/edit/delete) | ✅ Done |
| User management (CRUD for staff/admin) | ✅ Done |
| Gallery image management (upload + reorder) | 🟡 Partial (API done, UI incomplete) |
| Promoter management + discount codes | 🔴 Planned |
| Password recovery (admin-managed reset) | 🟡 Admin can reset any user's password from the Users panel |
| Password recovery (self-service email link) | 🔴 Not implemented |

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
| Stripe webhook handler (`payment_intent.succeeded`) | ✅ Done |
| API rate limiting (login / checkout / payment-intent) | ✅ Done |
| Promoter & discount code API | 🔴 Planned |
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
| **Infrastructure** | Docker, Docker Compose, Caddy (reverse proxy) |

---

## 👤 User Roles

| Role | Access |
|---|---|
| `ADMIN` | Full admin panel: Configuration, Management, Validation, Users |
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
STRIPE_WEBHOOK_SECRET=whsec_...
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
2. Run `prisma migrate deploy` to sync the schema
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

Use the User Management panel at `/admin/users`, or bootstrap via script:

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
│   │   ├── schema.prisma          # All DB models
│   │   ├── migrations/            # Prisma migration history
│   │   └── seed.ts
│   └── src/
│       ├── controllers/           # admin · auth · checkout · ticketType
│       │                          # dev · expense · export · user · webhook
│       ├── middleware/            # auth.middleware (JWT + RBAC)
│       │                          # rateLimit.middleware
│       ├── routes/                # api.route.ts · user.route.ts · webhook.route.ts
│       ├── services/              # stripe · email · pdf · qr
│       └── index.ts               # Express app entry point
├── frontend/
│   └── src/
│       ├── components/            # StripeCheckout · ProtectedRoute · layout · ui
│       │   └── admin/             # AdminSidebar · management tabs
│       ├── pages/
│       │   ├── Customer.tsx       # Storefront
│       │   ├── Login.tsx
│       │   └── admin/             # Configuration · ManagementDashboard
│       │                          # ValidationScanner · DevDashboard · Users
│       ├── lib/
│       │   ├── api-client.ts      # Centralized fetch with JWT injection
│       │   └── store.ts           # useStore() — event data + localStorage cache
│       └── config/
│           └── api.ts
└── packages/
    └── schemas/                   # Shared Zod schemas (@partyon/schemas)
```

---

## 🔜 Roadmap (Next Development Phase)

### 🔧 Active Bug Fixes
- [ ] **PDF Layout Bug** — Hero image of variable dimensions causes QR code to overflow onto a second page. Fix: use `sharp` to pre-scale images + convert all fixed heights to `flex`-based layout.

### 🔴 Missing Features (High Priority)
- [ ] **Promoter System** — Promoter entities with associated discount codes; track sales per promoter in analytics
- [ ] **i18n (ES/PT)** — `react-i18next` integration for the customer storefront (Español / Português)
- [ ] **Newsletter Storage** — Save subscriber emails to a `Subscriber` model via `POST /api/subscribe`
- [ ] **Self-service Password Recovery** — `/auth/forgot-password` email link flow via Resend (admin-managed reset already exists in the Users panel)
- [ ] **Gallery Image Manager** — Drag-and-drop upload/reorder UI in the backoffice (API is ready)

### 🛡️ Security & Infrastructure
- [ ] **Production Stripe keys** — Switch `sk_test_...` → `sk_live_...` before any live event
- [ ] **Custom email domain** — Replace `onboarding@resend.dev` with verified domain in Resend
- [ ] **HTTPS + Caddy** — TLS in front of the backend (Caddyfile already included)
- [ ] **Database Backups** — Automated `pg_dump` with off-site storage
- [ ] **Secure credentials** — Change `POSTGRES_PASSWORD` from default `adminpassword`

> See [PROJECT_BACKLOG.md](./PROJECT_BACKLOG.md) for the full detailed task list.

---

## ⚙️ Pre-Production Checklist

```
[ ] Stripe LIVE keys configured and tested with a real payment
[ ] Stripe webhook endpoint registered (STRIPE_WEBHOOK_SECRET set)
[ ] Custom email domain verified in Resend (not onboarding@resend.dev)
[ ] HTTPS active on backend via Caddy (required for Stripe webhooks)
[ ] JWT_SECRET is a cryptographically random 64+ char string
[ ] CORS restricted to FRONTEND_URL production domain
[ ] Rate limiting verified active on auth and payment endpoints
[ ] Admin and staff users created with secure passwords
[ ] Default database credentials changed (not 'adminpassword')
[ ] prisma db push replaced with prisma migrate deploy in docker-compose
[ ] Database backup strategy in place before the event
[ ] Full purchase flow tested end-to-end in production
[ ] QR scanner tested with a real printed ticket
[ ] Walk-in sale tested with both payment methods
[ ] Confirmation emails verified (check spam folder)
[ ] PDF ticket reviewed — QR is not split across pages
```

---

> [!TIP]
> **Timezone**: This platform is strictly configured for **Europe/Lisbon** timezone. All datetime inputs are interpreted in this zone server-side via `date-fns-tz`. Ensure your host system clock is synced (NTP).

> [!WARNING]
> **PDF Layout**: The PDF generator uses fixed pixel dimensions. If the hero background image has an unusual aspect ratio, the QR code section may overflow. A fix using `sharp` for image pre-processing is planned in the next sprint.

> [!IMPORTANT]
> **Stripe Webhook**: The webhook handler (`POST /webhooks/stripe` for `payment_intent.succeeded`) is implemented. Ensure `STRIPE_WEBHOOK_SECRET` is set in `backend/.env` and the endpoint is registered in the Stripe Dashboard before going live.
