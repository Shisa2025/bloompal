# Admin dashboard

BloomPal has a working admin dashboard under the existing application. This document explains the current dashboard surface and how it may fit into future product architecture.

## Current scope

- **CURRENT**: Admin dashboard pages exist under `/admin/dashboard` with locale-prefixed routes in the Next.js app.
- **CURRENT**: Admin data is scoped to the signed-in admin's assigned users.
- **CURRENT**: The dashboard displays stored activity where available.
- **PROPOSED**: The dashboard may later become part of a broader clinician/organisation portal, while BloomPal internal privileged administration may justify a separate surface.
- **FUTURE**: Production role boundaries, institutional workflows, audit trails, and clinical governance require separate design.

## Account model

- Admin accounts can sign in through the existing login flow.
- Admin signup uses an admin registration code.
- Users can be assigned to an admin.
- Admin dashboard operations are scoped to assigned users.
- The current model is intentionally smaller than the proposed long-term role model.

## Pages

| Route | Current purpose |
| --- | --- |
| `/admin/dashboard` | Overview of assigned-user activity, recent sessions, inactivity, and reward totals |
| `/admin/dashboard/users` | Assigned-user management, search, status filter, pagination, and user status |
| `/admin/dashboard/users/new` | Create an assigned user with a temporary password |
| `/admin/dashboard/users/[userid]` | View and manage an assigned user's account and activity |
| `/admin/dashboard/sessions` | Review completed game sessions |
| `/admin/dashboard/motion` | Review aggregate game activity metrics, including left/right game actions where recorded |
| `/admin/dashboard/analytics` | Review aggregate activity, duration, active-user, and game-popularity trends |
| `/admin/dashboard/reports` | Download available CSV reports |

The previous `/admin/dashboard/players` URLs redirect to the corresponding user pages.

## Current versus future responsibility

### CURRENT

The dashboard is an admin workspace for the current prototype. It helps demonstrate that gameplay data can be reviewed after sessions are completed.

### PROPOSED

Future product planning may separate:

- therapist/clinician workflows,
- organisation administration,
- patient-facing programme views,
- and BloomPal internal platform administration.

### FUTURE

Real healthcare deployment would require additional validation around:

- authorization boundaries,
- audit trails,
- clinical data governance,
- consent and retention,
- support operations,
- regulatory pathway,
- and institution onboarding.

## Activity data

BloomPal records completed activity data such as completion times, duration, game action counts, successful actions, attempts, and result metadata where supported by the game. Available session metrics vary by activity: some activities record attempts and successful actions, some record left/right game actions, and newer watering sessions may store watering momentum percentage information in result metadata rather than meaningful left/right action counts.

The dashboard can currently show assigned users, completed sessions, average duration, recent or last activity, days since last activity, activity breakdown, activity popularity, flowers, fruits, fish, bugs, snapshots, and game-specific attempt success where the underlying game records meaningful attempts.

The dashboard should not imply clinical recovery, biomechanical measurement, raw webcam video storage, or raw MediaPipe landmark history. The snapshot game may store generated garden snapshot image data, so documentation should not claim that BloomPal stores no images of any kind.

## Intentional non-implementation for this foundation task

This task does not add:

- new backend APIs,
- new authentication logic,
- new database tables,
- production RBAC,
- role separation between therapist and organisation admin,
- PDF/XLSX export,
- search or pagination expansion,
- or deployment changes.
