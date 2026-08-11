# Public online room deployment

> Optional paid alternative: the active application uses the same-origin Vercel
> routes documented in [online-room-vercel.md](online-room-vercel.md). This
> FunctionGraph runbook requires a paid dedicated APIG gateway for a public
> browser endpoint and is not needed for the recommended deployment.

BloomPal's first online room uses HTTPS polling instead of WebSocket. The browser
updates movement every 250 ms while walking and every second while idle. Presence
expires after five seconds, and the public room is capped at eight players.

This is a prototype deployment runbook. It does not provision or modify cloud
resources automatically.

## 1. Local end-to-end setup

1. Create or select a disposable PostgreSQL database. Do not use the production
   database for local multiplayer testing.
2. Back up the database, point `DATABASE_URL` or `ONLINE_ROOM_DATABASE_URL` at
   it, and run `npm run db:migrate`.
3. Generate a signing secret:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

4. Add the following to `.env.local`:

   ```dotenv
   ONLINE_ROOM_ENABLED=1
   ONLINE_ROOM_API_URL=http://localhost:8787/online-room
   ONLINE_ROOM_SIGNING_SECRET=<generated-secret>
   ONLINE_ROOM_ALLOWED_ORIGINS=http://localhost:3000
   ONLINE_ROOM_DATABASE_URL=<test-postgresql-url>
   DATABASE_SSL_MODE=require
   DATABASE_POOL_MAX=2
   ROOM_MAX_PLAYERS=8
   PRESENCE_TTL_MS=5000
   ```

5. In one terminal run `npm run online:dev`. In another run `npm run dev`.
6. Sign in with two different user accounts in separate browser profiles, open
   the bedroom computer, and verify that both characters appear and move.

## 2. Prepare the deployment package

Run:

```powershell
npm run online:function:package
```

The script builds `.artifacts/bloompal-online-room.zip`. The archive contains the
FunctionGraph handler, the shared protocol contract, and production PostgreSQL
dependencies. Do not add `.env.local` to the archive.

## 3. Create FunctionGraph in AP-Singapore

1. In Huawei Cloud, switch the region to **AP-Singapore**.
2. Create a FunctionGraph v2 **event function** named
   `bloompal-online-room`.
3. Select Node.js 20.15, handler `index.handler`, 512 MB memory, and a five
   second timeout.
4. Set single-instance concurrency to 10, maximum instances to 4, and reserved
   instances to 0.
5. Upload `.artifacts/bloompal-online-room.zip` and deploy it.
6. Add encrypted environment variables:

   ```text
   ONLINE_ROOM_DATABASE_URL=<production-postgresql-url>
   DATABASE_SSL_MODE=require
   DATABASE_POOL_MAX=2
   ONLINE_ROOM_SIGNING_SECRET=<same-secret-used-by-vercel>
   ONLINE_ROOM_ALLOWED_ORIGINS=https://<production-vercel-domain>
   ROOM_MAX_PLAYERS=8
   PRESENCE_TTL_MS=5000
   ```

7. Do not configure a reserved instance for the prototype. If cold-start latency
   becomes visible later, measure it before enabling one.

FunctionGraph supports AP-Singapore and Node.js 20 event functions. See the
[supported runtimes](https://support.huaweicloud.com/intl/en-us/usermanual-functiongraph/functiongraph_01_0151.html).

## 4. Confirm external PostgreSQL access

Start with FunctionGraph's default public network access. After APIG is attached,
call `GET /online-room/v1/health?deep=1`. A successful response is:

```json
{"ok":true,"database":"connected"}
```

If the external database requires an IP allowlist or the deep health check fails:

1. Create a VPC and subnet in AP-Singapore.
2. Buy the smallest suitable Public NAT Gateway and allocate an EIP.
3. Add an SNAT rule for the function subnet.
4. Enable VPC access on `bloompal-online-room` and select that subnet.
5. Add the EIP to the database provider's allowlist.
6. Repeat the deep health check.

Huawei documents both the default fixed FunctionGraph SNAT and the VPC/NAT EIP
route in its [source IP guide](https://support.huaweicloud.com/intl/en-us/functiongraph_faq/functiongraph_03_0885.html).

## 5. Create and publish APIG

1. Create the smallest suitable APIG dedicated instance in AP-Singapore and
   enable public ingress.
2. Add a synchronous FunctionGraph trigger for `bloompal-online-room`.
3. Configure HTTPS, method `ANY`, path `/online-room/{proxy+}`, and prefix
   matching.
4. Set the backend timeout to 5000 ms and APIG authentication to `None`.
   Application requests are still authenticated by the short-lived Bearer ticket;
   never expose an APIG AppSecret in the browser.
5. Add an API throttling policy of 80 requests per second.
6. Publish the API to `RELEASE` and copy the HTTPS invocation origin.
7. Verify these requests:
   - `GET /online-room/v1/health` returns 200.
   - `GET /online-room/v1/health?deep=1` returns 200 and `connected`.
   - `POST /online-room/v1/sync` without a Bearer ticket returns 401.
   - An `OPTIONS` request from the Vercel origin returns that exact origin in
     `Access-Control-Allow-Origin`.

The trigger configuration follows Huawei's
[APIG dedicated trigger guide](https://support.huaweicloud.com/usermanual-functiongraph/functiongraph_01_0204.html).

## 6. Enable the Vercel application

1. Back up the production database and run `npm run db:migrate` against it.
2. In Vercel, add these **Production** environment variables:

   ```text
   ONLINE_ROOM_API_URL=https://<apig-invocation-origin>/online-room
   ONLINE_ROOM_SIGNING_SECRET=<same-functiongraph-secret>
   ONLINE_ROOM_ENABLED=0
   ```

3. Deploy with the feature disabled and verify
   `POST /api/online-room/ticket` is unavailable as expected.
4. Set `ONLINE_ROOM_ENABLED=1` and redeploy.
5. Test with two different production accounts and browser profiles.

## 7. Monitoring and rollback

- Enable LTS logs and Cloud Eye/APIG alarms for 5xx and 429 responses.
- Logs contain request ID, status, duration, and active count only. Never log
  Bearer tickets, display names, email addresses, or positions.
- To stop new entry immediately, set `ONLINE_ROOM_ENABLED=0` in Vercel and
  redeploy. Existing presence expires in five seconds.
- To roll back the backend, restore the previous FunctionGraph version or alias.
  The `online_room_presence` table is safe to leave in place because it contains
  only expiring transient state.
