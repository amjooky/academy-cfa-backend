# CFA Academy SaaS — Perplexity QA Use Cases

Use this document to run structured manual QA with a Perplexity assistant (or any reviewer). Paste **one use case at a time**, perform the steps in the browser, and compare outcomes to **Expected results**.

## Environment

| Item | Value |
|------|--------|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| Tenant header | `demo` (via `VITE_DEFAULT_TENANT` or `x-tenant-id: demo`) |
| MySQL | XAMPP — run `npm run db:reset` for seed data |

### Demo credentials

| Role | Email | Password | Login tab |
|------|-------|----------|-----------|
| Staff (admin) | admin@demo.com | password | Personnel |
| Staff (coach) | coach@demo.com | password | Personnel |
| Parent (seed) | parent@demo.com | password | Parent |
| Child (seed) | child@demo.com | password | Enfant |

---

## How to run with Perplexity

1. Start backend: `npm run dev:backend`
2. Start frontend: `npm run dev:frontend`
3. Copy a single **UC-XX** block below into Perplexity.
4. Execute each step in order; record **PASS** or **FAIL** with screenshots if needed.
5. For DB-dependent cases, run `npm run db:reset` first when preconditions say so.

---

## UC-01 — Public registration (parent only, no child login)

**Role:** Parent (new applicant)  
**Maps to:** Registration UX — confirmation screen, no auto-login  
**Preconditions:** Backend running; use a **new** parent email (e.g. `ahmed.trabelsi@parent.tn`)

### Steps

1. Open http://localhost:5173
2. Click register / online enrollment link from login.
3. Fill parent: Ahmed Trabelsi, ahmed.trabelsi@parent.tn, +216 98 765 432, password `Test123!`
4. Fill child: Yassine Trabelsi, DOB (not default), Goalkeeper, U17 Elite.
5. Leave **“Create Enfant account”** unchecked.
6. Submit application.

### Expected results

- Confirmation screen: **“Application submitted!”** and 48-hour review message.
- **No** automatic redirect into parent portal.
- Button **Return to Sign In** only.
- DOB field had no pre-filled 2014-01-01.

---

## UC-02 — Public registration with child account

**Role:** Parent  
**Maps to:** Optional child login at registration  
**Preconditions:** New parent email not used before

### Steps

1. Register with parent email `sara.benali@parent.tn`.
2. Check **Create Enfant account**; child email `yassine.benali@child.tn`, same password as parent.
3. Submit.

### Expected results

- Confirmation mentions child login email for **after approval**.
- No auto-login.
- After admin approves (UC-04), child can sign in on **Enfant** tab.

---

## UC-03 — Admin pending card shows real parent contact (B8)

**Role:** Staff (admin)  
**Maps to:** Bug **B8**  
**Preconditions:** UC-01 completed with Ahmed Trabelsi / ahmed.trabelsi@parent.tn / +216 98 765 432

### Steps

1. Sign out if needed.
2. Login **Personnel** tab: admin@demo.com / password.
3. Open **Rosters**.
4. Find pending card for Yassine Trabelsi.

### Expected results

- Parent contact shows **Ahmed Trabelsi** (not “Mr. Slimane Trabelsi”).
- Email: **ahmed.trabelsi@parent.tn** (not fabricated yassine.trabelsi@parent.com).
- Phone: **+216 98 765 432** (not random).
- Child DOB, Goalkeeper, U17 Elite match submission.

---

## UC-04 — Admin approves pending player

**Role:** Staff  
**Preconditions:** UC-03 pending application visible

### Steps

1. On pending card, keep or set squad U17 Elite.
2. Click **Approve**.
3. Refresh or re-open Rosters.

### Expected results

- Pending count decreases; player appears in active roster when approved.
- Parent (after login) sees child on **My Family** with timeline progressing toward Approved.

---

## UC-05 — Parent calendar scoped to child team

**Role:** Parent  
**Maps to:** Parent calendar API  
**Preconditions:** `npm run db:reset` OR parent@demo.com linked to p1 (U17); backend running

### Steps

1. Login **Parent** tab: parent@demo.com / password.
2. Open **Calendar**.

### Expected results

- Events shown are for child’s team (U17) and academy-wide sessions, not unrelated squads only.
- No **Add Event** or **Record Roll-Call** buttons.

---

## UC-06 — Parent Progress pending enrollment (B7)

**Role:** Parent  
**Maps to:** Bug **B7**  
**Preconditions:** UC-01 submitted but **not** approved; login parent@demo.com OR fresh parent if approved path differs

For **pending-only** test: login as parent who only has `pending` child (use account right after UC-01 if you add login after approval skip — or use unapproved registration by logging parent@demo.com before approve if child still pending).

### Steps

1. Login Parent tab with account that has only **pending** child.
2. Open **Progress**.

### Expected results

- Message like: progress appears **after enrollment is approved**.
- **No** text containing `db:reset` or developer commands.

---

## UC-07 — Parent Progress after approval with evaluations

**Role:** Parent  
**Preconditions:** `npm run db:reset`; parent@demo.com; child p1 has seed evaluation

### Steps

1. Login Parent: parent@demo.com / password.
2. Open **Progress**; select Youssef Msakni.
3. View radar and assessment history.

### Expected results

- Ratings reflect DB evaluation (not random hash).
- Assessment history lists seed eval rows.

---

## UC-08 — Child portal read-only (B10)

**Role:** Child  
**Maps to:** Bug **B10**, export UX  
**Preconditions:** `npm run db:reset`; child@demo.com linked to p1

### Steps

1. Login **Enfant** tab: child@demo.com / password.
2. Open **Progress** with zero evals (if possible) or after reset check empty state.
3. Check **Export Progress Report** button.

### Expected results

- Empty history: neutral message, **no** “Submit the first assessment →” as fake link.
- Export button **disabled** when no evaluations.

---

## UC-09 — Admin dashboard empty DB (B9)

**Role:** Staff  
**Maps to:** Bug **B9**  
**Preconditions:** MySQL running but **no** seed (empty tenant or fresh DB without reset)

### Steps

1. Login Personnel: admin@demo.com / password (empty DB).
2. Open **Dashboard**.

### Expected results

- KPIs show **0** (honest live data).
- Banner: **No academy data in MySQL yet** with steps: XAMPP MySQL, `npm run db:reset`, refresh.
- Banner is **staff-only** (not shown to parents).

---

## UC-10 — Admin dashboard after db:reset

**Role:** Staff  
**Preconditions:** `npm run db:reset` completed

### Steps

1. Login Personnel: admin@demo.com / password.
2. Open **Dashboard**.

### Expected results

- Active players > 0 (7 from seed).
- Coaches, revenue, upcoming events populated from MySQL.
- No empty-DB setup banner.

---

## UC-11 — Login page title and logo (B11)

**Role:** Any (unauthenticated)  
**Maps to:** Bug **B11**, logo fix

### Steps

1. Open http://localhost:5173 (logged out).
2. Check browser tab title.
3. Check left panel logo on login screen.

### Expected results

- Tab title: **CFA — Chermiti Football Academy** (no “Admin Portal”).
- CFA logo/badge visible (SVG), not broken image icon.

---

## UC-12 — Parent cannot access another child’s data

**Role:** Parent  
**Maps to:** Security / parent scope  
**Preconditions:** parent@demo.com linked only to p1

### Steps

1. Login as parent@demo.com.
2. (Optional API) Call `GET /api/v1/parent/children/p3` with parent JWT and tenant demo — p3 is not their child.

### Expected results

- API returns **403** for another player’s id.
- UI never lists other families’ children.

---

## Regression checklist (quick)

| ID | One-line check |
|----|----------------|
| B7 | Parent never sees `db:reset` |
| B8 | Pending card parent = form data |
| B9 | Admin empty DB shows setup banner |
| B10 | Child eval empty state has no fake submit CTA |
| B11 | Login title without Admin Portal |
| UX | Registration → confirmation, not auto-login |
| UX | DOB not pre-filled 2014-01-01 |
| UX | Parent My Family shows application timeline |

---

## Reporting template

```
UC-ID: UC-03
Result: PASS | FAIL
Notes: ...
Environment: Windows / XAMPP / commit: ...
```
