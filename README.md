# Permit to Work (PTW) — CMMS Safety Module

A production-ready Permit to Work module built as an intern assignment for Opmaint.

PTW is safety-critical software used in industrial plants before any dangerous work begins — welding near flammable vapour, entry into confined spaces, electrical isolation, working at height. When the software gets it wrong, the failure mode is a person getting hurt with no audit trail of who authorised what.

**Live Demo:** [https://ptw-cmms.vercel.app](https://ptw-cmms.vercel.app) ← replace with your Vercel URL

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Requester | `requester@ptw.dev` | `password123` |
| Area Owner (Area A & B, Chennai) | `areaowner@ptw.dev` | `password123` |
| Safety Officer | `safety@ptw.dev` | `password123` |
| Admin | `admin@ptw.dev` | `password123` |

The seed creates a populated system: 2 plants, 4 areas, 6 equipment items, 10 permits spread across all statuses and all four types.

---

## Setup (Local)

### Prerequisites
- Node.js 18+
- PostgreSQL (local, or a free Supabase project at supabase.com)

### Steps

```bash
git clone <repo-url>
cd ptw-cmms
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and fill in DATABASE_URL and AUTH_SECRET

# Run migrations
npx prisma migrate dev --name init

# Seed the database (4 users, 2 plants, 6 equipment, 10 permits)
npm run seed

# Start dev server
npm run dev
```

Open http://localhost:3000 — you'll be redirected to /login.

### Run Tests

```bash
npm run test
```

38 tests covering:
- All valid state machine transitions
- All illegal transitions (they throw `PermitTransitionError`)
- Self-approval invariant (a person can never approve their own permit, even as admin)
- Area owner scope (can't approve permits outside their areas)
- Role-based action visibility

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo into Vercel
3. Add environment variables in the Vercel dashboard:
   - `DATABASE_URL` — your Supabase/Neon connection string
   - `AUTH_SECRET` — 32+ character random string (`openssl rand -base64 32`)
   - `NEXT_PUBLIC_BASE_URL` — your Vercel URL (for QR codes)
   - `CRON_SECRET` — any random string
4. Deploy
5. After deploy: `npx prisma db push` then `npm run seed` (or run from Vercel console)

The `vercel.json` configures a cron job that calls `/api/cron/expire-permits` every 5 minutes to auto-expire permits past their end time.

---

## Architecture

### Data Model

One `permits` table for all shared fields + four satellite tables for type-specific data:
- `hot_work_details` — gas test readings, fire watch, extinguisher
- `confined_space_details` — atmospheric tests, rescue plan, entry/exit log
- `height_work_details` — access method, fall arrest, anchor point
- `electrical_loto_details` — isolation points, lock/tag numbers, testing

Adding a 5th permit type (Excavation, Radiation, etc.) = one new table + one enum value. Nothing else changes.

### State Machine

Lives entirely in `/src/lib/permit-state-machine.ts` — a pure function with zero database calls. The same function is used in every API route and in the test suite. No way to bypass it by hitting the API directly.

```
DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE
                                          ↓
                              SUSPENDED ←→ ACTIVE → CLOSED → CLOSED_VERIFIED
                                    ↓
                                 EXPIRED
```

Any non-terminal state → CANCELLED.

Rules enforced server-side:
- A permit cannot be activated before its `plannedStart`
- All required approvers must approve before status moves to APPROVED
- A person can never approve their own permit (even admin)
- Area owners can only approve permits in their assigned areas
- Expired permits can never be reactivated — a new permit must be raised
- Every illegal transition returns a clear error message

### Roles

| Role | Key Permission |
|------|---------------|
| REQUESTER | Creates permits, closes own permits |
| AREA_OWNER | Approves permits for their areas only |
| SAFETY_OFFICER | Approves any permit, suspends/activates |
| ADMIN | Full access, user/area management |

### Audit Trail

Every state change and approval is logged to the `audit_logs` table — immutable (no updates, no deletes). Visible on the permit detail page as a readable timeline.

---

## Decisions Where the Spec Was Silent

**Extension cap**: Max 1 extension per permit, max 8 hours. After 1 extension, a new permit must be raised. This is a common industrial practice — indefinite extensions are not appropriate for safety permits.

**Multiple area owners**: Any one area owner from the area can approve. The permit moves to APPROVED when both the area-owner slot AND the safety-officer slot are filled.

**Conflict detection**: Hot Work vs Confined Space conflicts return HTTP 409 with a warning and the conflicting permit numbers. The front-end shows the warning and allows saving as draft — blocking would prevent raising the permit at all, which is wrong. The approvers make the final call.

**Activation permission**: Only Safety Officer and Admin can activate. In practice this is the safety officer doing the final on-site check before work begins.

**Notifications**: Stub function that logs to console — see `lib/api-helpers.ts`. A real implementation would call a transactional email/SMS service here.

---

## What I'd Build Next

1. **Real-time updates** — WebSocket or polling so dashboards update when a permit status changes without full refresh
2. **Photo attachments** — gas test meter photos, site condition photos (URL field is there already, just need storage integration)
3. **Mobile PWA** — offline capability for areas with poor connectivity
4. **PDF export** — printable permit form that matches the paper form format plants are familiar with
5. **Push notifications** — the notification stub is already wired in everywhere, needs a Firebase/APNs integration
6. **Multi-language** — Tamil and Hindi support for Chennai/plant use

---

## What I Knowingly Left Broken / Incomplete

- The Admin panel at `/admin` shows only a user list — user creation UI and area assignment UI are not fully built (the API routes exist)
- The conflict detection only checks Hot Work vs Confined Space — should also check all permit types against each other
- No session timeout (NextAuth defaults apply)
- The `EDIT` action on draft permits doesn't reload type-specific fields if you change permit type after initial creation
- Atmospheric test readings in the confined space form aren't validated against safe limits on the frontend (the display shows red when unsafe, but submission isn't blocked)

---

## AI Usage

I used Claude (Sonnet 4.6) extensively:
- Generating boilerplate for API routes and component structure
- Synthesising knowledge about Permit to Work industrial standards
- Drafting the Prisma schema structure

Everything I generated I read, edited to fit the actual domain requirements (real PTW field names, Indian industrial context, actual safe limits for O₂/LEL/H₂S), and can defend line by line in the Loom walkthrough.

The state machine (`lib/permit-state-machine.ts`) and the test files I wrote largely myself after reading through industrial PTW documentation — the self-approval invariant and area-scope rules are the kind of thing that requires domain understanding, not just pattern matching.

The seed data reflects real Indian plant naming conventions (Chennai Refinery, CR-P-001 equipment tags, contractor names) based on looking at actual CMMS data.

---

## Stack

- **Frontend**: React 19 + TypeScript, Next.js 16 App Router, Tailwind CSS
- **Backend**: Next.js API routes (Node.js/TypeScript)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js v5 (JWT sessions, email+password)
- **Testing**: Vitest
- **Deploy**: Vercel + Supabase (free tier)
