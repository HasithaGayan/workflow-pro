
# WorkFlow Pro — Backend API

## Purpose

WorkFlow Pro is a full-stack project and task management
application designed for student groups and small teams.

This backend is the first step toward supporting real
projects, tasks, users, authentication and collaboration.

## Technology

- Node.js
- TypeScript
- Express.js
- tsx
- Node.js built-in test runner

## Architecture

HTTP Request
→ Express Middleware
→ Route
→ Controller
→ Service
→ JSON Response

Responsibilities:

- Routes: Match HTTP endpoints.
- Controllers: Validate inputs and build responses.
- Services: Handle task-related data operations.
- Middleware: Handle logging and unexpected errors.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Server health |
| GET | /api/tasks | List tasks |
| GET | /api/tasks/:id | Get task details |

Error handling:

- HTTP 400: Invalid task ID
- HTTP 404: Task or route not found
- HTTP 500: Unexpected server error

## Local Setup

From the server directory:

1. Run `npm install`.
2. Optionally create `.env` using `.env.example`.
3. Run `npm run typecheck`.
4. Run `npm run dev`.
5. Visit `http://localhost:4000/api/health`.

## Testing

Run `npm run test:api`.

The initial suite covers six API scenarios,
including successful requests and error responses.

## Current Limitations

- Tasks are temporary demonstration data.
- No database is connected.
- No registration or login exists.
- No user permissions exist.
- No task creation or modification endpoints exist.
- This API is not yet deployed for public use.

These features will be implemented in future milestones.

## PostgreSQL and Prisma Setup

1. Install PostgreSQL and create the development database.
2. Configure server/.env with a private DATABASE_URL.
3. From server/, run npm install.
4. Run npm run db:generate to generate Prisma Client.
5. Run npm run typecheck and npm run test:api.
6. Run npm run dev to start the API.

Database: workflow_pro_dev

The database schema and SQL practice are documented in db/.

API integration tests currently require the fictional Day 42
development records. They are not yet isolated test fixtures.

Never commit .env, database credentials or database backups.
Do not reset the existing database during setup.
