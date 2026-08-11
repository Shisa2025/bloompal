# Huawei Cloud deployment notes

BloomPal is kept cloud-neutral so it can move to Huawei Cloud without changing the account, admin, or activity data model.

## Recommended mapping

| BloomPal need | Huawei Cloud service |
| --- | --- |
| PostgreSQL database | RDS for PostgreSQL |
| Container/runtime | ECS with Docker initially; CCE when orchestration is needed |
| Images and future media | OBS |
| Secrets | Cloud Secret Management Service or encrypted environment injection |
| Public HTTPS | ELB plus a managed certificate, or an equivalent ingress |
| Logs/metrics | LTS and Cloud Eye |

The application uses the standard `pg` PostgreSQL driver rather than a provider-specific database SDK. The production image uses Next.js standalone output and is defined in `Dockerfile`.

## Migration sequence

1. Create an RDS for PostgreSQL instance and database in the application's VPC.
2. Export the source with `pg_dump` and restore it with `pg_restore`; preserve extensions and use a PostgreSQL version supported by both services.
3. Configure `DATABASE_URL`, `DATABASE_POOL_MAX`, and `ADMIN_SIGNUP_CODE` as secrets. Configure `DATABASE_SSL_MODE` and `DATABASE_CA_CERT` if the RDS connection policy requires an explicit CA.
4. Run `npm run db:migrate` once as a deployment job. The migration is transactional, advisory-locked, and safe to rerun.
5. Build and deploy `Dockerfile`, expose port 3000, and use `/api/health` for health checks.
6. Verify role-based login, one admin's user isolation, CSV downloads, and one completion of each game before switching traffic.

## Snapshot storage

Current snapshot image data remains in PostgreSQL for compatibility with the existing UI. For production scale, add an OBS storage adapter, write new snapshots to OBS, and store `storage_provider='obs'` plus the object key in PostgreSQL. A background migration can move existing rows without altering the admin/user relationships or game-session schema.

## Operational cautions

- Do not set `ALLOW_DATABASE_RESET` in production.
- Keep RDS private and restrict its security group to the application runtime.
- Use a separate database and registration code for each environment.
- Back up and rehearse restore before the final cutover.

## Public online room

The public multiplayer room now uses same-origin Next.js APIs on Vercel and the
main PostgreSQL connection. Deployment steps are documented in
[online-room-vercel.md](online-room-vercel.md). The older paid APIG/FunctionGraph
option remains in [online-room-functiongraph.md](online-room-functiongraph.md)
only as an alternative architecture.
