# Hidden Features & Modules Documentation

To simplify the interface and focus solely on the core parent registration and payment flows, several modules have been hidden from the primary user interface. This document describes those features, their technical implementations, endpoints, and how to re-enable them if needed.

---

## 1. Events & Calendar Scheduling

*   **Description**: Allows coaches and admins to schedule training sessions, exams, and matches for U13, U15, or U17 squads. Parents and child players can view their assigned squad events.
*   **Key Files**:
    *   Client UI: Managed via `planning` tab view in [`app.tsx`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/clients/admin/src/app.tsx).
    *   Backend Routes: Managed via `POST /teams/:id/players` in [`academyRoutes.ts`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/services/academy/src/routes/academyRoutes.ts).
    *   Helper Utilities: Event filtering is handled in [`eventFilters.ts`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/clients/admin/src/lib/eventFilters.ts).
*   **Database Tables**: `events` and `attendance` tables.

---

## 2. Pedagogical Radars, Evaluations & Progress Reports

*   **Description**: Coaches can rate players from 1 to 10 on Speed, Technique, and Tactics, and write subjective notes. These feed radar averages and allow parents to view/export an AI-generated progress dossier for their child.
*   **Key Files**:
    *   Client UI: Managed via the `pedagogy` tab view in [`app.tsx`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/clients/admin/src/app.tsx).
    *   Backend Routes: `GET /evaluations` and `POST /evaluations` in [`academyRoutes.ts`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/services/academy/src/routes/academyRoutes.ts).
*   **Database Tables**: `evaluations` table.

---

## 3. Scout AI Suite & Intelligent Training Plans

*   **Description**: Generates AI scouting recommendation plans and structures multi-stage training sessions based on selected focus areas (stamina, technical, tactical) and durations.
*   **Key Files**:
    *   Client UI: Managed via the `ai` tab view in [`app.tsx`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/clients/admin/src/app.tsx).
    *   AI Client Utilities: Text-formatting scripts in [`formatProgressReport.ts`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/clients/admin/src/lib/formatProgressReport.ts).
    *   Backend Services: Interacts with the backend AI service (`/services/ai`).

---

## 4. Document Vault & XP Promotions

*   **Description**: Provides document storage (medical certificates, national IDs) for players with pending/verified states, alongside XP-granting manual buttons in the roster list.
*   **Key Files**:
    *   Client UI: Roster controls and "Vault" actions inside [`app.tsx`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/clients/admin/src/app.tsx).
*   **Database Tables**: `player_badges` and `players` (for `xp_total` and `rank`).

---

## 5. Academy Branding Settings

*   **Description**: Configures custom colors, logos, and languages for the academy tenant.
*   **Key Files**:
    *   Client Component: [`SettingsTab.tsx`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/clients/admin/src/components/SettingsTab.tsx).
    *   Backend Profile Endpoints: `GET /profile` and `PUT /profile` in [`academyRoutes.ts`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/services/academy/src/routes/academyRoutes.ts).
*   **Database Tables**: `academy_profile`.

---

## How to Re-enable Features

To restore any of these views, simply locate the sidebar navigation section under `<nav>` in [`app.tsx`](file:///c:/Users/Sam/Desktop/projects%20FF/Academy/academy-saas/clients/admin/src/app.tsx) and uncomment the corresponding buttons:

```tsx
{/* To restore Calendar: */}
<button type="button" onClick={() => setActiveTab('planning')} className={`app-nav-btn${activeTab === 'planning' ? ' app-nav-btn--active' : ''}`}>
  <span>📅</span> Calendar
</button>
```
