# WorkFlow Pro

A full-stack project and task management platform for organizing workspaces, managing priorities and tracking project progress.

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel)

## Live Application

**[Launch WorkFlow Pro](https://workflow-pro-weld.vercel.app)**

Create an account, organize projects, manage tasks and explore the Kanban board using sample data.

## Application Preview

![WorkFlow Pro Kanban Board](docs/screenshots/06-kanban-board.png)

## Key Features

- Account registration and authentication
- Personalized workspace dashboard
- Workspace and project management
- Task creation and priority management
- To Do, In Progress and Done workflows
- Kanban task board
- Task search and filtering
- Project completion insights
- Persistent PostgreSQL storage
- Responsive user interface

## Screenshots

### Workspace Dashboard

![Workspace Dashboard](docs/screenshots/03-dashboard.png)

### Projects and Tasks

![Project and Task Management](docs/screenshots/05-task-management.png)

### Task Insights

![Task Insights](docs/screenshots/08-task-insights.png)

### Authentication

| Sign In | Create Account |
| --- | --- |
| ![Sign In](docs/screenshots/01-login.png) | ![Registration](docs/screenshots/02-register.png) |

### Additional Views

- [Project creation](docs/screenshots/04-projects.png)
- [Mobile dashboard](docs/screenshots/07-mobile-view.png)

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Neon |
| ORM | Prisma |
| Authentication | Argon2id and session-based authentication |
| Validation | Zod |
| Security | Helmet, CSRF protection, proxy authentication, rate limiting |
| Deployment | Vercel |
| Version Control | Git and GitHub |

## System Architecture

```mermaid
flowchart TD
    A[User Browser] -->|HTTPS| B[Next.js Frontend]
    B --> C[Server-side API Proxy]
    C -->|Private Proxy Authentication| D[Express Backend]
    D --> E[Prisma ORM]
    E --> F[(Neon PostgreSQL)]
```

The frontend and backend are deployed independently. The server-side proxy connects the frontend to the Express API without exposing the shared authentication secret to the browser.

## Security Design

- Argon2id password hashing and session-based authentication
- Secure HTTP-only session cookies and CSRF protection
- Workspace membership and role-based access controls
- Server-side input validation
- Database-backed authentication rate limiting
- Protected backend API access and server-side environment variables

## Deployment Verification

- Production frontend and backend deployments completed.
- PostgreSQL migrations successfully applied.
- Production API health check returned HTTP 200.
- Unauthorized direct backend requests returned HTTP 403.
- Browser testing demonstrated registration, login, workspace creation, project creation, task creation and status updates.
- A second test account displayed a separate empty workspace dashboard.

Authenticated cross-account API authorization and additional security verification remain pending.

## Project Documentation

[Cloud Deployment and Verification](docs/cloud-deployment.md)

## Project Status

WorkFlow Pro is a publicly accessible portfolio demonstration with a functioning cloud backend and persistent database. It is not a security-audited enterprise service. Use sample data rather than confidential information.

## Developer

**Hasitha Gayan** â€” AI and Full-Stack Development

- [GitHub](https://github.com/HasithaGayan)
- [Developer Portfolio](https://hasithagayan.github.io/ai-fullstack-87/)

---

Built as part of an AI and Full-Stack engineering development journey.
