# Admin dashboard documentation

The Admin Dashboard is a frontend prototype located at:

```txt
app/admin/dashboard
```

It is available locally at:

```txt
/admin/dashboard
```

The `/dashboard` route is reserved for the player/game home dashboard. Admin pages should use `/admin/dashboard`.

## Purpose

The dashboard demonstrates how administrators and care staff may review rehabilitation activity once gameplay, hand tracking, and backend storage are finalized.

The current implementation uses mock data only. It is intended to show page structure, navigation, reusable components, and likely data presentation patterns.

## Current pages

### Dashboard

Route:

```txt
/admin/dashboard
```

Current purpose:

- Shows a high-level care overview.
- Displays summary cards for total players, active players, sessions today, average duration, improvement rate, and players needing attention.
- Shows recent sessions, recent activity, weekly sessions, improvement trend, and attention flags.

Expected future backend data:

- Live player totals
- Current engagement status
- Today's scheduled/completed sessions
- Average session duration
- Improvement calculations
- Automatically flagged players
- Recent care-team activity

### Players

Route:

```txt
/admin/dashboard/players
```

Current purpose:

- Displays a mock list of players.
- Shows age, condition type, assigned employee, last session, progress, and status.

Expected future backend data:

- Real player profiles
- Assignment data
- Status and attention flags
- Last session timestamps
- Progress metrics from completed sessions

TODO: Real search, filtering, and pagination should be added after backend data contracts are available.

### Individual player profile

Route:

```txt
/admin/dashboard/players/[id]
```

Current purpose:

- Shows profile information for one player.
- Displays session history, performance metrics, motion metrics, and employee notes.

Expected future backend data:

- Full player profile
- Assigned employee information
- Historical sessions
- Motion records
- Calculated progress metrics
- Employee notes and care-team observations

TODO: Editing, note creation, assignment changes, and clinical review workflows are intentionally not implemented yet.

### Sessions

Route:

```txt
/admin/dashboard/sessions
```

Current purpose:

- Shows mock game session history.
- Displays session ID, player, date, duration, activity type, accuracy, and completion status.

Expected future backend data:

- Real game sessions
- Activity details
- Timing and duration
- Completion status
- Accuracy/performance summaries
- Links back to related players and motion records

TODO: Real filtering, sorting, and pagination should be implemented later.

### Motion

Route:

```txt
/admin/dashboard/motion
```

Current purpose:

- Shows placeholder hand-tracking and motion records.
- Displays pinch count, hand open/close count, reaction time, motion accuracy, and left/right hand usage.

Expected future backend data:

- Real webcam hand-tracking outputs
- Session-linked motion measurements
- Finalized clinical or gameplay motion metrics
- Confidence/quality indicators if required

TODO: Motion metric names and thresholds should be updated after gameplay and tracking requirements are finalized.

### Analytics

Route:

```txt
/admin/dashboard/analytics
```

Current purpose:

- Shows mock charts for weekly sessions, average duration, improvement trend, and activity popularity.

Expected future backend data:

- Aggregated session counts
- Average session duration over time
- Player improvement trends
- Activity popularity and completion patterns
- Comparison periods if required

TODO: Real analytics should be calculated from backend-approved data definitions.

### Reports

Route:

```txt
/admin/dashboard/reports
```

Current purpose:

- Shows report templates and mock generated report history.
- Demonstrates where CSV/PDF-style exports may eventually live.

Expected future backend data:

- Generated reports
- Export history
- Report owner/author
- Report status
- Download links or export jobs

TODO: CSV/PDF generation and download behavior are intentionally not implemented yet.

## Shared dashboard components

Reusable dashboard pieces live in:

```txt
app/admin/dashboard/_components
```

Current examples:

- Dashboard shell
- Sidebar navigation
- Stat cards
- Panels
- Tables
- Status badges
- Progress bars
- Simple chart components
- Icons

## Mock data and types

Mock data and TypeScript interfaces live in:

```txt
app/admin/dashboard/_lib
```

Current examples:

- `types.ts`
- `mock-data.ts`
- `format.ts`

These files are placeholders for future backend integration. They should be replaced or adapted when the backend team finalizes API contracts.

## Development notes

- Keep the dashboard frontend data-source agnostic.
- Do not add backend assumptions directly into UI components.
- Prefer reusable components for repeated dashboard patterns.
- Keep mock data clearly separated from UI code.
- Do not implement search, pagination, exports, or database access until those requirements are approved.
