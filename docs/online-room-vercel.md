# Public online room on Vercel

The production online room uses same-origin Next.js route handlers. It does not
require Huawei APIG, a public FunctionGraph trigger, CORS configuration, or an
online-room signing secret.

## Architecture

- `POST /api/online-room/ticket` authenticates the existing `bloompal_session`
  cookie and creates a per-tab session ID.
- `POST /api/online-room/sync` authenticates the same login cookie, updates the
  player's short-lived PostgreSQL presence, and returns the active room snapshot.
- `POST /api/online-room/leave` removes the matching presence immediately.
- Presence expires after five seconds when a browser disappears without leaving.
- Moving clients poll every 250 ms and idle clients every 500 ms; request time is
  subtracted from the next delay so database latency does not compound polling.
- Room sync uses one atomic PostgreSQL statement after the per-instance schema
  check, and the short-lived credential avoids a login-session query per poll.
- The first sync runs idempotent `CREATE TABLE IF NOT EXISTS` statements, while
  `npm run db:migrate` remains the preferred deployment migration.

## Required Vercel variables

The app already uses `DATABASE_URL`. The online room adds only these optional
controls:

```env
ONLINE_ROOM_ENABLED=1
ROOM_MAX_PLAYERS=8
PRESENCE_TTL_MS=5000
```

`ONLINE_ROOM_ENABLED` defaults to enabled when omitted. Set it to `0` only to
hide the bedroom computer hotspot and reject new room requests.

Do not configure `ONLINE_ROOM_API_URL`, `ONLINE_ROOM_SIGNING_SECRET`, or
`ONLINE_ROOM_ALLOWED_ORIGINS` for this architecture.

## Deployment

1. Back up the PostgreSQL database.
2. Run `npm run db:migrate` against the intended database, or allow the first
   sync request to create the idempotent presence table.
3. Add the variables above to Vercel Production and Preview as needed.
4. Deploy the application.
5. Sign in with two different user accounts in two browser profiles.
6. Enter the bedroom, click the computer, and confirm both display names and
   movements are visible.

## Huawei cleanup

No APIG gateway is needed. If the FunctionGraph prototype has no trigger, it is
not part of the request path. Disable or delete it if it is no longer wanted.
Any signing secret exposed during setup must not be reused elsewhere.
