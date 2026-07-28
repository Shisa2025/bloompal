# BloomPal system overview

BloomPal is a web-based rehabilitation and engagement platform for elderly users and rehabilitation patients. The product combines a player-facing gardening game with webcam-based hand tracking and an admin-facing dashboard for reviewing rehabilitation activity.

This document describes the current architecture and the assumptions behind the prototype. It does not define backend APIs, database implementation, authentication rules, or production deployment details.

## Current application areas

BloomPal currently consists of these major areas:

- Landing / Front Page
  - Public entry point for the project.
  - Introduces the BloomPal experience and directs users toward login or game-related areas.

- Login
  - Existing authentication entry point.
  - Currently routes dashboard users toward the admin dashboard prototype.
  - TODO: Production authentication and authorization should be completed by the responsible backend/auth team.

- Player Game
  - Gardening Game
    - Intended player-facing rehabilitation activity.
    - Activities may include pinching flowers, watering plants, picking fruits, catching butterflies, and arranging bouquets.
  - Webcam Hand Tracking
    - Intended to collect hand movement signals during gameplay.
    - MediaPipe/webcam details are still being finalized.
  - Session Recording
    - Expected to record each game session and related performance metrics.
    - TODO: Backend team should define final persistence and session lifecycle behavior.

- Admin Dashboard
  - Located at `app/admin/dashboard`.
  - Available at `/admin/dashboard`.
  - Uses mock data only.
  - Current sections:
    - Dashboard Overview
    - Players
    - Individual Player Profile
    - Sessions
    - Motion
    - Analytics
    - Reports

## Current frontend structure

The admin dashboard prototype is organized under:

```txt
app/admin/dashboard
├── _components
├── _lib
├── analytics
├── motion
├── players
├── reports
├── sessions
├── actions.ts
├── dashboard.module.css
├── layout.tsx
└── page.tsx
```

Important supporting files:

- `app/admin/dashboard/_components`
  - Shared dashboard UI components, charts, icons, and shell layout.

- `app/admin/dashboard/_lib`
  - Mock data, TypeScript interfaces, and formatting helpers.

- `app/admin/dashboard/dashboard.module.css`
  - Dashboard-specific styling.

- `next.config.ts`
  - Reserved for project-level Next.js configuration. The admin dashboard does not depend on route redirects.

## High-level data flow

At a high level, BloomPal is expected to work like this:

1. A user enters BloomPal through the landing page or login page.
2. A player starts a gardening rehabilitation game.
3. Webcam hand tracking captures hand movement during gameplay.
4. The game creates a session record.
5. Task results and motion metrics are attached to the session.
6. Backend storage saves the final data.
7. The admin dashboard reads stored data.
8. Admin users review player progress, sessions, motion metrics, analytics, and reports.

The current dashboard does not connect to real backend data yet. It uses local mock data to demonstrate the intended structure and user experience.

## Current assumptions

- Gameplay mechanics are still evolving.
- Hand-tracking metrics are not final.
- The database schema is not final.
- Admin dashboard pages should remain flexible and data-source agnostic.
- Current dashboard data is mock-only and should be easy to replace later.
- Dashboard UI should focus on rehabilitation/care management, not gameplay mechanics.

## Future development roadmap

Suggested order for future work:

1. Finalize gameplay activities and session lifecycle.
2. Finalize hand-tracking metrics and metric naming.
3. Finalize backend data contracts.
4. Replace dashboard mock data with backend-provided data.
5. Add production authentication and role authorization.
6. Add real search, filtering, and pagination.
7. Add export generation for CSV/PDF reports.
8. Separate admin and employee workflows if required.

## Out of scope for the current prototype

- Backend implementation
- Database schema implementation
- API route creation
- Real authentication or authorization
- Search implementation
- Pagination implementation
- CSV/PDF export implementation
- Employee/admin role separation
