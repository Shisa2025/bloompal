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
   - The system stores approved aggregate metrics such as duration, attempts, successful actions, and left/right game actions where supported by the activity.
   - CURRENT: Available session metrics vary by activity. Some activities record attempts/successful actions, some record left/right game actions, and newer watering sessions may store watering momentum percentage information in result metadata.
   - CURRENT: Raw webcam video history and raw MediaPipe landmark history are not stored for admin dashboard review.

7. **Data Stored**
   - Backend/database logic stores approved session and account records.
   - CURRENT: The snapshot game may store generated garden snapshot image data; this is separate from raw webcam video or raw MediaPipe landmark history.
   - CURRENT: Engagement/economy/customisation data may include wallet/coins, owned music, owned outfits, equipped outfit, asset sales, and coin transactions.
   - CURRENT: Shared online-room presence is stored as short-lived operational state and should not be treated as a clinical record or historical movement analysis.
   - This documentation update does not add database schema, migrations, API routes, or secrets.

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
- Current user dashboard scenes such as garden/home, bedroom, courtyard/front-house, pond/shop, wardrobe/outfit, music, and merchant/shop exist inside `/dashboard` rather than as separate public routes.
- Current shared online-room synchronisation uses `/api/online-room/ticket`, `/api/online-room/sync`, and `/api/online-room/leave`.

With locale prefixes enabled, these are served under the active locale, for example `/en-SG/docs` or `/zh-CN/docs`.
