# BloomPal conceptual data model

This document describes the expected data model conceptually. It is not a database schema and should not be treated as an implementation contract.

The current admin dashboard prototype uses TypeScript interfaces and mock data under:

```txt
app/admin/dashboard/_lib/types.ts
app/admin/dashboard/_lib/mock-data.ts
```

These interfaces exist to help the frontend stay organized while the final backend and database requirements are still being defined.

## Entities

### User

Represents a person who can use BloomPal.

Expected examples:

- Admin
- Employee
- Player

Conceptual fields:

- ID
- Name
- Email
- Role
- Avatar
- Created date
- Last active date

Relationship notes:

- A user may have a related player profile.
- A user may have a related employee profile.
- Admin users may not need a separate profile in the current prototype.

### PlayerProfile

Represents rehabilitation-related information for a player.

Conceptual fields:

- Player profile ID
- Linked user ID
- Age
- Condition type
- Assigned employee
- Status
- Progress percentage
- Joined date
- Last session date
- Preferred hand

Relationship notes:

- One player profile belongs to one user.
- One player profile can have many game sessions.
- One player profile can have many motion records through sessions.
- One player profile can have many employee notes.
- One player profile is assigned to an employee profile.

### EmployeeProfile

Represents staff members who support players.

Conceptual fields:

- Employee profile ID
- Linked user ID
- Job title
- Department
- Assigned players

Relationship notes:

- One employee profile belongs to one user.
- One employee profile can be assigned to many player profiles.
- One employee profile can create many employee notes.
- One employee profile can be associated with many game sessions.

### GameSession

Represents a gameplay/rehabilitation session completed by a player.

Conceptual fields:

- Session ID
- Player ID
- Employee ID
- Start time
- Duration
- Activity type
- Accuracy percentage
- Completion status

Relationship notes:

- One game session belongs to one player.
- One game session may be associated with one employee or care owner.
- One game session can have many task results.
- One game session can have one or more motion records, depending on final tracking requirements.

### GameTaskResult

Represents performance on a specific task inside a game session.

Conceptual fields:

- Task result ID
- Session ID
- Task name
- Attempts
- Successful attempts
- Score
- Completion time

Relationship notes:

- One game task result belongs to one game session.
- A game session can contain many task results.

### MotionRecord

Represents hand-tracking metrics captured during a session.

Conceptual placeholder fields:

- Motion record ID
- Session ID
- Player ID
- Recorded time
- Pinch count
- Hand open/close count
- Average reaction time
- Motion accuracy
- Left hand usage
- Right hand usage

Relationship notes:

- One motion record belongs to one player.
- One motion record is linked to a game session.
- Motion metrics may change once gameplay and hand-tracking requirements are finalized.

### EmployeeNote

Represents a staff note about a player.

Conceptual fields:

- Note ID
- Player ID
- Employee ID
- Content
- Category
- Created date

Relationship notes:

- One employee note belongs to one player.
- One employee note is created by one employee.
- Notes support care-team context but are not currently connected to a backend.

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
    ├── GameSessions
    └── EmployeeNotes
```

## Implementation boundary

Do not use this document as a database migration plan. The backend/database team should define the final schema, constraints, indexes, API contracts, and storage strategy.

TODO: Update this document when final backend entities and field names are approved.
