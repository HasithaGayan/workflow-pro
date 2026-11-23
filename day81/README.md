# HGBP — Day 81: WorkFlow Pro Docker integration

**Scope:** Private local Docker learning environment, NOT an internet-ready deployment.
It uses the existing Next.js v16 frontend, Express v5 backend, and a **new isolated**
PostgreSQL 18 database. Original Windows PostgreSQL data and `server/.env` are not used.

## Architecture

Browser `127.0.0.1:3081` -> Next.js `web:3000` -> restricted Next.js API proxy
-> Express `api:4000` -> PostgreSQL `db:5432`.

The API and database are not published as host ports. Only the frontend binds to
Windows loopback. A separate named volume `workflow-pro-day81_workflow_day81_pgdata`
keeps the new database between container stops/restarts. On PostgreSQL 18, the
volume mounts at `/var/lib/postgresql` (NOT `/var/lib/postgresql/data`).

## One-command launch

Use the supplied installer to create the files and initial secret. From the repo:

```powershell
docker compose --env-file day81/.env -f compose.day81.yaml up --build -d --wait
```

Then open **http://127.0.0.1:3081/login** and test `Register` + `Sign in` with a
new fictional user. This environment starts with an **empty** PostgreSQL database.
No credentials or real personal data are imported from the local Windows database.

### Useful commands

```powershell
docker compose --env-file day81/.env -f compose.day81.yaml ps
docker compose --env-file day81/.env -f compose.day81.yaml logs --tail=80 web api db
docker compose --env-file day81/.env -f compose.day81.yaml stop
docker compose --env-file day81/.env -f compose.day81.yaml start
docker compose --env-file day81/.env -f compose.day81.yaml down
```

**Never run `down -v`** unless you intentionally want to delete the NEW Docker
PostgreSQL data. Never run `docker system prune --volumes` on a machine with
important Docker volumes. `down` without `-v` preserves the named data volume.

### Data persistence test

Create a test account via the web app, then `docker compose ... down` (no `-v`),
`docker compose ... up -d --wait` and verify you can sign back in. The database
should retain the account. Ensure this is just the Day 81 container database.

### Common issues

- **Port 3081 busy:** Shut down the other local app occupying 3081 first;
  no attempt is made to terminate it automatically.
- **Next.js font fetch fails in build:** `next/font/google` downloads fonts while
  building. Check connectivity; do not replace source files without review.
- **Docker builds use disk space:** In Docker Desktop Settings -> VM resources,
  verify disk-image path starts with `D:\HGBP_Docker_Data`.
- **Unhealthy service:** Inspect `docker compose ... logs --tail=80 SERVICE`.
- **Prisma client:** Generated at backend image build from the existing
  `server/prisma/schema.prisma`; no action is taken against your Windows database.
- **Schema changes:** This Day 81 initial SQL executes only with a brand-new
  PostgreSQL volume. Production requires reviewed versioned migrations.
- **Private dev HTTP only:** Express intentionally uses NODE_ENV=development so
  login cookies work over local HTTP. Do not publish this configuration online.

## What Day 81 proves

Dockerfile for frontend and backend; isolated PostgreSQL 18 + named persistent
volume; Compose service DNS and health checks; local loopback-only frontend;
startup from documented commands. Complete the hands-on persistence, recovery,
code comprehension and GitHub verification before marking the roadmap day done.

## Source control safety

- `day81/.env` is a generated local secret. **Never commit or share it.**
- Keep all existing `learning/python` untracked files intact.
- Review `git status` and stage only the seven project Docker/Compose/docs files.
- No Git push is performed by the kit installer.

## Day 81 follow-up: Docker browser-origin fix

The Next.js proxy validates the browser request origin before forwarding it to
Express. In Docker, Next.js may see an internal request URL (container address)
while the browser sends `Origin: http://127.0.0.1:3081`. The Compose web service
sets `WORKFLOW_PUBLIC_ORIGIN=http://127.0.0.1:3081`; the proxy compares against
that explicit public origin. The API's independent expected origin remains
`http://api:4000` because the proxy validates incoming requests, then sends a
new internal request with that origin. **Neither origin nor CSRF checks are disabled.**

Test the endpoint and negative cases with:

```powershell
node --test tests/day81-origin-proxy.test.mjs
```

Use `http://127.0.0.1:3081/register` (not `localhost:3081`) for this exact
local training configuration. **Do not deploy this localhost Compose stack to
the public Internet**; production requires HTTPS and reviewed origin/cookie
settings.
