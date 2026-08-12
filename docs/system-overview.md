# BloomPal system overview

BloomPal is a Tech4City semifinal prototype for rehabilitation engagement. The current product combines a player-facing gardening experience, webcam-based hand tracking, session persistence, and an admin-facing dashboard for reviewing assigned-user activity.

This document separates what exists today from the architecture BloomPal may grow into later. It is not a claim of clinical validation, regulatory approval, certification, hospital deployment, or production institutional readiness.

## Documentation classes

BloomPal keeps public-facing product documentation separate from private team-only governance material:

- **Public product documentation**: rendered at `/docs` for safe product, architecture, roadmap, and maturity communication.
- **Internal governance material**: maintained separately for team-only authority, security, privacy, clinical, AI, and operations design notes.

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

### CURRENT: User dashboard and engagement space

- The current user dashboard includes multiple scenes inside the dashboard experience: garden/home, bedroom, courtyard/front-house, pond/shop, wardrobe/outfit, music, merchant/shop, and coin/wallet interactions.
- These are engagement and personalisation features that support the garden experience. They should not be presented as clinical outcomes.
- The shared online room is a current prototype shared-presence space where active signed-in users can see present users represented by names, avatars, outfits, and synchronised movement/presence.
- The shared online room should not be described as full cooperative rehabilitation gameplay, chat, messaging, therapist sessions, or production-ready multiplayer.

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
5. Task results and activity-specific game-session metrics are attached to that session where supported.
6. Backend storage saves approved session, reward, engagement/economy, customisation, and short-lived shared-room presence data.
7. Admin dashboard pages read scoped activity data for assigned users.
8. Admin users review activity trends, sessions, game activity metrics, analytics, and reports.

## Current data categories

| Category | Current examples | Boundary |
| --- | --- | --- |
| Gameplay/session data | `game_sessions`, game rewards, duration, attempts, successful actions, left/right game actions where recorded | Used for activity review, not validated clinical recovery claims |
| Engagement/economy/customisation data | wallet/coins, owned music, owned outfits, equipped outfit, sales of collected flowers, bugs, fish, and fruits | Prototype engagement currency only, not real-money payments |
| Shared-room presence data | `online_room_presence` | Short-lived operational presence state, not a clinical record or historical movement analysis |

## Out of scope for this foundation task

- New backend implementation
- New authentication system
- New database schema or migrations
- New API routes
- Production RBAC
- Search or pagination expansion
- PDF/XLSX export
- Regulatory, clinical, security, or compliance claims
