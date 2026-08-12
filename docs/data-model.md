# BloomPal data model

This document describes the expected BloomPal data entities conceptually. It is not a database schema, migration plan, API contract, or implementation instruction.

Database implementation is handled separately. The purpose here is to help future developers understand the domain objects that the frontend and dashboard are likely to discuss.

## Current data maturity

- **CURRENT**: The codebase already contains account, admin, game session, reward, shop economy, and aggregate game-session metric persistence.
- **PROPOSED**: The following entity names provide a shared vocabulary for future product planning.
- **OPEN QUESTION**: Final clinical metrics, role boundaries, audit requirements, and retention requirements need validation before production use.

## Conceptual entities

### User

Represents a sign-in account.

In simple terms:

- A user has identity and login information.
- A user may act as a normal user/player or as an admin account in the current MVP.
- Future roles should be designed carefully so account role does not automatically grant unrestricted clinical access.

### PlayerProfile

Represents player-specific rehabilitation or engagement context.

In simple terms:

- A player profile belongs to a user.
- A player profile is the subject of gameplay sessions and activity review.
- It may eventually include programme assignment, condition category, care goals, or accessibility preferences.

### EmployeeProfile

Represents a staff-facing profile, such as a therapist, clinician, or admin user.

In simple terms:

- An employee profile belongs to a user account.
- It may be assigned to players.
- It may write notes or review activity and progress when future clinical requirements are defined.

### GameSession

Represents one completed or attempted gameplay session.

In simple terms:

- A session belongs to a player.
- A session has timing, activity type, completion status, and summary results.
- It is the main record that connects gameplay to dashboard review.

### GameTaskResult

Represents detailed task-level results inside a game session.

In simple terms:

- A task result belongs to a game session.
- It describes how a player performed on a particular activity step or game objective.
- Final fields depend on the gameplay team's confirmed mechanics.

### MotionRecord

Represents a conceptual future record for approved aggregate hand-tracking or movement-related metrics from gameplay.

In simple terms:

- A motion record belongs to a game session.
- It should store summarized metrics, not raw webcam video or raw MediaPipe landmark history.
- Example metrics may include repetitions, attempts, successful actions, duration, left/right usage, and reaction timing.
- In the current MVP, these ideas are mostly represented by aggregate fields on `game_sessions`, not a separate implemented `MotionRecord` table.

### Current shop and reward entities

The current implementation also includes user-facing shop/economy tables:

- `user_wallets`: user coin balance and wallet state.
- `user_music`: music tracks owned by a user.
- `user_outfits`: outfits owned by a user for dashboard customisation.
- `user_dashboard_settings.equipped_outfit_id`: selected outfit used by the current dashboard and shared-room appearance.
- `asset_sales`: sold collectible or reward assets from flowers, bugs, fish, or fruit.
- `coin_transactions`: coin economy transaction history.

The front-house/shop/music/outfit layer reads existing inventory tables such as `user_plants`, `user_bugs`, `user_fish`, and `user_fruits`. Selling a collectible records the sale and coin transaction; it should not be described as deleting the underlying historical activity record. Coins are a prototype engagement currency and should not be described as real-money value or payment.

Snapshot records may store generated garden snapshot image data; this is separate from raw webcam video or raw MediaPipe landmark history.

### Current transient online-room presence

`online_room_presence` stores the short-lived state needed to render the public
shared online room. One row represents one signed-in player in a logical room and
contains only the current position, facing direction, movement state, selected
outfit, display name, session ordering data, and expiry time.

Presence is operational state rather than activity history: explicit exits delete
it immediately, missing heartbeats expire after five seconds, and it must not be
used for rehabilitation reporting or historical movement analysis.

The current shared online room supports multi-user presence and synchronised movement/presence. It should not be documented as chat, therapist interaction, cooperative rehabilitation gameplay, or production-ready multiplayer.

### EmployeeNote

Represents a staff note about a player.

In simple terms:

- A note belongs to a player profile.
- A note is written by an employee profile.
- Future clinical note rules, privacy rules, audit requirements, and edit/delete policies need product and compliance review.

## Relationship summary

```txt
User
├── PlayerProfile
│   ├── GameSession
│   │   ├── GameTaskResult
│   │   └── MotionRecord
│   └── EmployeeNote
└── EmployeeProfile
    ├── assigned PlayerProfiles
    └── EmployeeNotes
```

## Intentional non-implementation

This document does not define:

- database table names,
- database field types,
- migration files,
- indexes,
- API routes,
- authorization rules,
- clinical thresholds,
- regulatory retention rules,
- or production audit requirements.
