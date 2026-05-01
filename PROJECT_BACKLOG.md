# 📂 PartyOn: Project Backlog & Roadmap

This document serves as the primary source of truth for the **PartyOn Event ERP** pending tasks. It outlines critical business requirements, architectural improvements, and future ideas to be addressed when development resumes.

---

## 🛠️ Phase 1: Core Pending Features
*High-priority business rules and operational tools.*

### 1. Mandatory "En Puerta" (Door) Ticket Type
- **Requirement**: Every event must have a non-deletable "Door" ticket category.
- **Tasks**:
  - [ ] **Schema**: Add `isDoorType` boolean field to `TicketType` model.
  - [ ] **Admin Flow**: Modify `createEvent` controller to automatically create a "Door" `TicketType` with price 0 by default.
  - [ ] **Validation**: Update `Configuration.tsx` to prevent the deletion of any ticket where `isDoorType === true`.
  - [ ] **UI**: Add a specific field in the Event Info section to quickly update the "Precio en Puerta".

### 2. Walk-in Registration (Validation UI)
- **Requirement**: Allow staff to register and charge for entries directly at the door.
- **Tasks**:
  - [ ] **Frontend**: Add a "Registrar Venta en Puerta" button to the `ValidationScanner.tsx` interface.
  - [ ] **Backend**: Create `POST /api/admin/tickets/walk-in` endpoint.
    - Logic: Create a `Ticket` record with `status: 'USED'`, link it to the event's "Door" type, and record the `pricePaid`.
  - [ ] **Analytics**: Verify that walk-in revenue is correctly aggregated in the `ManagementDashboard`.

### 3. User Management System
- **Requirement**: A dashboard to manage administrative and staff access.
- **Tasks**:
  - [ ] **UI**: Create `/admin/users` page for listing, creating, and deleting system users.
  - [ ] **Backend**: Implement CRUD endpoints for the `User` model.
  - [ ] **Security**: Ensure password hashing (bcrypt) is enforced on all user creation/updates.

### 4. Role-Based Access Control (RBAC)
- **Requirement**: Restrict access based on user responsibility.
- **Tasks**:
  - [ ] **Middleware**: Update `authMiddleware.ts` to accept required roles (e.g., `authorize(['ADMIN'])`).
  - [ ] **Frontend Guard**: Hide restricted sidebar items (`Configuration`, `Dev`, `Management`) for users with the `STAFF` role.
  - [ ] **Route Protection**: Ensure `STAFF` accounts are redirected to `/admin/validation` if they attempt to access sensitive paths.

---

## 🛡️ Phase 2: Security & Architecture (Production Audit)
*Essential measures for a safe and stable public launch.*

### 1. Password Recovery Flow
- [ ] **Endpoints**: Implement `/auth/forgot-password` and `/auth/reset-password`.
- [ ] **Service**: Integrate with the `EmailService` (Resend) to send secure, time-limited reset tokens.

### 2. API Rate Limiting & Protection
- [ ] **Middleware**: Implement `express-rate-limit` on the following endpoints:
  - `POST /auth/login` (Brute-force prevention).
  - `POST /checkout` & `/create-payment-intent` (Payment spam prevention).
- [ ] **DDoS Guard**: Document the requirement for Cloudflare proxying in production.

### 3. Data Integrity & Validation
- [ ] **Schema Validation**: Introduce **Zod** or **Joi** on the backend to validate all incoming request bodies before they reach the database layer.
- [ ] **Error Boundaries**: Wrap the React application in a top-level Error Boundary to prevent "White Screen of Death" scenarios during unexpected runtime errors.

### 4. Automated Backups
- [ ] **DB Persistence**: Configure a sidecar container in `docker-compose.yml` to perform daily PostgreSQL dumps.
- [ ] **Off-site Storage**: Script the movement of dumps to an external S3 bucket or secure volume.

---

## 🚀 Phase 3: Future Polish & Expansion
*Nice-to-have features for V2.*

- [ ] **Discount Coupons**: Support for percentage or fixed-amount discount codes at checkout.
- [ ] **Real-time Scan Feed**: A dashboard widget showing the "Entry Curve" (scans per hour) to help promoters manage staff.
- [ ] **Multi-Event Portal**: A landing page showing all `ACTIVE` events for a specific promoter.
- [ ] **Whitelabel Domains**: Allow mapping custom domains (e.g., `tickets.myevent.com`) directly to specific event IDs.

---

> [!IMPORTANT]
> **Technical Debt Note**: Before resuming, run `npx prisma generate` and `npm update` to ensure all dependencies and the database client are synced with the latest schema changes.
