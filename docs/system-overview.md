# BloomPal system overview

BloomPal is a Tech4City semifinal prototype for rehabilitation engagement. The current product combines a player-facing gardening experience, webcam-based hand tracking, session persistence, and an admin-facing dashboard for reviewing assigned-user activity.

This document separates what exists today from the architecture BloomPal may grow into later. It is not a claim of clinical validation, regulatory approval, certification, hospital deployment, or production institutional readiness.

## Documentation classes

BloomPal now keeps three documentation/content classes separate:

- **Public product documentation**: rendered at `/docs` for safe product, architecture, roadmap, and maturity communication.
- **Private product/governance documentation**: kept under `docs-internal/product-governance` for team-only authority, security, privacy, clinical, AI, and operations design notes.
- **Private competition/pitch strategy**: kept under `docs-internal/competition` and not rendered as product documentation.

Competition strategy may inform product thinking, but competition tactics should not appear in the public documentation site.

## Maturity labels

- **CURRENT**: Implemented or directly observable in the prototype.
- **PROPOSED**: Target architecture or design direction being considered.
- **FUTURE**: Capability that would become relevant for real clinical or institutional deployment.
- **OPEN QUESTION**: Requires technical, clinical, regulatory, business, or stakeholder validation.

## Current application areas

### CURRENT: Main BloomPal experience

- Localized Next.js App Router application under `app/[locale]`.
- The current root experience prepares the BloomPal workspace and routes desktop users toward login.
- The visual identity uses warm ivory backgrounds, deep forest-green text, sage surfaces, soft rounded cards, and restrained accent colors.

### CURRENT: Login and account access

- User and Admin sign-in are available through the existing login flow.
- Signup and password-change flows already exist.
- Authentication and database logic are already present in the codebase and should not be rewritten for the site-surface foundation.

### CURRENT: Player game

- Player-facing routes exist for gardening-themed hand-interaction activities.
- Webcam hand tracking is used inside gameplay experiences.
- Session and reward persistence already exists for completed activities.

### CURRENT: Admin dashboard

- The admin dashboard is located at `app/[locale]/admin/dashboard`.
- Shared admin implementation files live under `app/admin/dashboard`.
- Admin pages include overview, users, user profile, sessions, motion, analytics, and reports.
- Admin data is scoped to the signed-in admin's assigned users.

## Proposed logical surfaces

The long-term conceptual topology is:

| Target domain | Purpose | Current MVP mapping |
| --- | --- | --- |
| `www.bloompal.sg` | Public / marketing | Main BloomPal entry route |
| `docs.bloompal.sg` | Public product documentation | `/docs` informational route |
| `app.bloompal.sg` | Patient / clinician / organisation portal | `/app` concept route plus existing user experience |
| `admin.bloompal.sg` | BloomPal internal privileged administration | Existing `/admin/dashboard` route |

### PROPOSED: Single project for MVP

The current MVP should remain in one existing project/deployment. The new logical surfaces are route-level foundations only. They do not require four independent Vercel projects before the prototype deadline.

## Proposed role model

### CURRENT

- User
- Admin

This is sufficient for the current prototype.

### PROPOSED / FUTURE

- **Patient**: access own programme and results.
- **Therapist / Clinician**: access assigned patients, configure authorised rehabilitation plans, and review progress.
- **Organisation Admin**: manage authorised staff and organisation-level configuration without automatic unrestricted clinical access.
- **BloomPal Admin**: operate and support the BloomPal platform without automatically receiving clinical authority or unrestricted patient access.

Role does not equal website. Patients, clinicians, and organisation administrators may eventually share the primary application surface with server-side role-based experiences.

## High-level data flow

1. A user enters BloomPal through the main experience or login.
2. A player starts a gardening activity.
3. Webcam hand tracking interprets hand movement during gameplay.
4. The game creates a session record.
5. Task results and aggregate game-session metrics are attached to that session.
6. Backend storage saves approved data.
7. Admin dashboard pages read scoped activity data.
8. Admin users review activity trends, sessions, game activity metrics, analytics, and reports.

## Out of scope for this foundation task

- New backend implementation
- New authentication system
- New database schema or migrations
- New API routes
- Production RBAC
- Search or pagination expansion
- PDF/XLSX export
- Regulatory, clinical, security, or compliance claims
