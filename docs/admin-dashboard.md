# Admin dashboard

BloomPal has separate `admin` and `user` account roles. The admin workspace is available at `/admin/dashboard` and is protected on the server by a database-backed session and an admin-role check.

## Account model

- An admin self-registers at `/signup?role=admin` with `ADMIN_SIGNUP_CODE`.
- A public user can self-register and starts without an admin.
- An admin can create users from `/admin/dashboard/users/new`. These users are assigned to that admin and must change their temporary password after their first login.
- A user belongs to zero or one admin; an admin can manage many users.
- Admin queries always include the signed-in admin ID. An admin cannot read or mutate another admin's users.
- Disabling a user or resetting their password invalidates all of that user's sessions.

## Pages

| Route | Live behavior |
| --- | --- |
| `/admin/dashboard` | Assigned-user, recent-session, inactivity, and reward totals |
| `/admin/dashboard/users` | Search, status filter, pagination, and user management |
| `/admin/dashboard/users/new` | Create an assigned user with a temporary password |
| `/admin/dashboard/users/[userid]` | Update profile, enable/disable, reset password, or release the user |
| `/admin/dashboard/sessions` | Filter and paginate real game sessions |
| `/admin/dashboard/motion` | Left/right repetition and action metrics recorded by the games |
| `/admin/dashboard/analytics` | Session, duration, active-user, and activity-popularity aggregates |
| `/admin/dashboard/reports` | Download assigned-user and session CSV reports |

The previous `/admin/dashboard/players` URLs redirect to the corresponding user pages.

## Activity data

Watering, bug collection, and snapshot completion are stored atomically with their reward records. Each browser completion uses a UUID for retry-safe, idempotent persistence. BloomPal records completion times, duration, repetitions, successful actions, and attempts; it does not store webcam video or hand landmark streams.

## Operations

Apply safe, idempotent schema updates with:

```bash
npm run db:migrate
```

`db:reset` is destructive and refuses to run unless `ALLOW_DATABASE_RESET=yes-reset-bloompal` is explicitly set. Do not enable that variable in production.
