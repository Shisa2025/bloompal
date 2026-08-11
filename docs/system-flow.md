# BloomPal system flow

This document describes how BloomPal data is expected to move from gameplay to review. It is a product and architecture guide, not a database implementation plan.

## Flow diagram

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
Game Activity Metrics Recorded
↓
Data Stored (handled by backend/database layer)
↓
Admin Dashboard
↓
Analytics & Reports
```

## Flow explanation

1. **User**
   - A player enters BloomPal through the current application.

2. **Login**
   - The user signs in through the existing User/Admin login flow.
   - CURRENT: Basic role entry exists.
   - FUTURE: Production authorization and role boundaries would need formal design.

3. **Play Gardening Game**
   - The player completes a gardening-themed activity such as watering, bug collection, fruit plucking, fish catching, or snapshot capture.
   - CURRENT: Several game routes already exist.

4. **Webcam Hand Tracking**
   - Webcam-based hand tracking interprets movement during gameplay.
   - CURRENT: Webcam hand tracking is used by the games.
   - OPEN QUESTION: Final clinical metric definitions and thresholds still require validation.

5. **Session Created**
   - A completed activity becomes a game session.
   - CURRENT: Session persistence exists for completed game activity.

6. **Game Activity Metrics Recorded**
   - The system stores approved aggregate metrics such as repetitions, attempts, successful actions, duration, and left/right activity.
   - CURRENT: Raw webcam video history and raw MediaPipe landmark history are not stored for admin dashboard review.

7. **Data Stored**
   - Backend/database logic stores approved session and account records.
   - CURRENT: The snapshot game may store generated garden snapshot image data; this is separate from raw webcam video or raw MediaPipe landmark history.
   - This foundation task does not add database schema, migrations, API routes, or secrets.

8. **Admin Dashboard**
   - The admin dashboard reads scoped data for assigned users.
   - CURRENT: Admin pages display assigned-user activity, sessions, game activity metrics, analytics, and reports.

9. **Analytics & Reports**
   - Admin users review aggregate trends and export available CSV reports.
   - FUTURE: PDF/XLSX, scheduled reports, audit trails, and institution-level reporting would require additional design.

## Current route surface mapping

- Main experience: `/`
- Documentation foundation: `/docs`
- Application/portal concept: `/app`
- Admin dashboard: `/admin/dashboard`

With locale prefixes enabled, these are served under the active locale, for example `/en-SG/docs` or `/zh-CN/docs`.
