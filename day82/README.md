# HGBP Day 82 — WorkFlow Pro GitHub Actions CI

**Goal:** On each push to `main`, pull request to `main`, or manual run, automatically check the source and test an isolated Docker stack on a fresh GitHub-hosted Ubuntu runner.

## What the workflow checks

1. Installs locked frontend dependencies with Node 22, runs ESLint and Next.js build.
2. Installs backend dependencies, generates Prisma 7 client using a harmless placeholder connection string, and runs TypeScript type checks.
3. Generates an ephemeral PostgreSQL password in a runner-local ignored `day81/.env`, then builds the **existing** `compose.day81.yaml` stack.
4. Verifies live frontend, origin protection, and anonymous-access security using `tests/day81-docker-smoke.test.mjs` and `tests/day81-origin-proxy.test.mjs`.
5. Creates a harmless marker **in the temporary runner PostgreSQL instance**, restarts the Compose stack without `-v`, and confirms the marker persists. Reruns the Docker tests.
6. Reports failures and stops temporary containers.

## What it deliberately does NOT do

- No public deployment. `compose.day81.yaml` is a **local development setup**, not an internet-facing secure production deployment.
- No GitHub or application secrets are required. The CI password is generated fresh for the temporary runner and is not committed.
- No access to the real Windows PostgreSQL database, the original developer machine, or local Git-ignored files.
- No alteration or deletion of unrelated user learning files.

## After the Day 82 installer is published

1. Visit **https://github.com/HasithaGayan/workflow-pro/actions**.
2. Open **WorkFlow Pro - Day 82 CI** for the commit that added the workflow.
3. Inspect both jobs: **Source quality and builds** and **Isolated Docker integration and persistence**.
4. The day is **complete only after both show green**. If either is red, copy the first error (not the entire log) and fix that specific cause. Do not hide or disable failing checks merely to obtain green status.
5. For a later repo README, use a real CI badge only after the workflow is confirmed.

## Local verification (optional; read-only)

```powershell
git status --short --branch
git log -1 --oneline
```

Do not run `docker compose down -v` on your existing machine: your Day 81 PostgreSQL volume contains test accounts and projects.
