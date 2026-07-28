# BloomPal system flow

This document describes the intended high-level flow from player interaction to admin review. It is conceptual only and does not define implementation details.

## Primary flow

```txt
User
↓
Login
↓
Play Gardening Game
↓
Webcam Hand Tracking
↓
Session Created
↓
Motion Metrics Recorded
↓
Data Stored
(handled by backend team)
↓
Admin Dashboard
↓
Analytics & Reports
```

## Flow explanation

1. User
   - A user may be a player, employee, or admin.
   - The current prototype focuses on the admin dashboard experience.

2. Login
   - Users enter the system through the login page.
   - TODO: Real authentication and role-based routing should be implemented later by the responsible team.

3. Play Gardening Game
   - A player completes rehabilitation activities through a gardening-themed game.
   - Example activities include pinching flowers, watering plants, picking fruits, catching butterflies, and arranging bouquets.

4. Webcam Hand Tracking
   - The game uses webcam-based hand tracking to observe motion during activities.
   - The exact hand-tracking metrics are still being finalized.

5. Session Created
   - Each gameplay attempt should create a game session.
   - A session is expected to include player, timing, activity type, duration, completion status, and performance summary.

6. Motion Metrics Recorded
   - Motion-related information is expected to be associated with the session.
   - Placeholder metrics currently include pinch count, hand open/close count, reaction time, motion accuracy, and left/right hand usage.

7. Data Stored
   - Backend and database implementation will be handled separately.
   - The frontend dashboard should eventually consume this stored data.

8. Admin Dashboard
   - Admin users review player progress, session history, motion metrics, analytics, and report summaries.
   - The current dashboard uses mock data to represent this future state.

9. Analytics & Reports
   - Aggregated session and motion data should support progress tracking and reporting.
   - TODO: Real analytics calculations and export generation should be added after backend data contracts are finalized.

## Important boundaries

The current frontend prototype does not:

- Store real session data
- Read from a real database
- Define backend APIs
- Generate real reports
- Enforce user roles
- Implement real search or pagination

These responsibilities should be added only after the project team finalizes the relevant backend, gameplay, and clinical requirements.
