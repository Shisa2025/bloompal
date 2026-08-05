# BloomPal data model

The implementation uses standard PostgreSQL. `database/migrate.mjs` is the executable, idempotent schema definition.

## Relationships

```text
users (role=admin)
  1 ─────── 0..n users (role=user)
                    │
                    ├── 0..n auth_sessions
                    ├── 0..n game_sessions
                    ├── 0..n user_plants
                    ├── 0..n user_bugs
                    ├── 0..n user_snapshots
                    └── 0..1 user_dashboard_settings
```

`users.admin_userid` is nullable. A foreign key and trigger ensure that a non-null value references an account whose role is `admin`. Deleting an admin releases its users by setting this field to null.

## Main tables

### `users`

Stores the unique user ID and email, bcrypt password hash, display name, role, optional admin owner, account status, forced-password-change flag, and login/audit timestamps. Plaintext password storage has been removed.

### `auth_sessions`

Stores only SHA-256 hashes of random opaque session tokens. Browser cookies are HttpOnly, SameSite=Lax, and Secure in production. Sessions expire and are checked against the current account status.

### `game_sessions`

Stores one completed activity with its user, activity type, start/end timestamps, validated duration, left/right repetitions, success/attempt counts, source reward record, and compact JSON metadata. The client session UUID and activity/source uniqueness constraints make retries idempotent.

### Reward and dashboard tables

- `user_plants`: seed selection, watering state, and unlocked flower.
- `user_bugs`: collected bugs and the active garden companion.
- `user_snapshots`: snapshot metadata and current database image data. `storage_provider` and `storage_key` allow a later move to object storage.
- `user_dashboard_settings`: the user's selected table flower.

## Data ownership

User game queries are scoped to the authenticated user ID. Admin queries join through `users.admin_userid`, so each admin sees only assigned users and their activity. Publicly registered users remain unassigned until an explicit assignment workflow is introduced.
