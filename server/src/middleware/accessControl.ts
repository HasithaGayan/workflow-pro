
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { prisma } from "../lib/prisma";

import {
  findSessionUser,
  SESSION_COOKIE_NAME,
} from "../services/authService";

import {
  createWorkspaceSchema,
  createProjectSchema,
  idSchema,
} from "../validation/teamSchemas";

import {
  createTaskSchema,
} from "../validation/taskSchemas";

function getCookie(req: Request): string | null {
  const header = req.headers.cookie;

  if (!header) return null;

  const prefix = `${SESSION_COOKIE_NAME}=`;

  for (const part of header.split(";")) {
    const value = part.trim();

    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }

  return null;
}

function parseId(value: unknown): bigint | null {
  const result = idSchema.safeParse(value);
  return result.success
    ? BigInt(result.data)
    : null;
}

function reject(
  res: Response,
  status: number,
  message: string
): void {
  res.status(status).json({
    success: false,
    error: message,
  });
}

function actorId(res: Response): bigint | null {
  const id: unknown = res.locals.actorId;
  return typeof id === "bigint" ? id : null;
}

// Run this before every protected business route.
export async function requireLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await findSessionUser(
      getCookie(req)
    );

    if (!user) {
      reject(res, 401, "Authentication required");
      return;
    }

    res.locals.actorId = BigInt(user.id);
    next();
  } catch (error) {
    next(error);
  }
}

async function findMembership(
  userId: bigint,
  workspaceId: bigint
) {
  return prisma.workspace_memberships.findFirst({
    where: {
      user_id: userId,
      workspace_id: workspaceId,
    },
    select: { role: true },
  });
}

async function projectWorkspace(
  projectId: bigint
): Promise<bigint | null> {
  const project = await prisma.projects.findUnique({
    where: { project_id: projectId },
    select: { workspace_id: true },
  });

  return project?.workspace_id ?? null;
}

async function taskWorkspace(
  taskId: bigint
): Promise<bigint | null> {
  const task = await prisma.tasks.findUnique({
    where: { task_id: taskId },
    select: { project_id: true },
  });

  if (!task) return null;

  return projectWorkspace(task.project_id);
}

// Secure /api/workspaces
export async function secureWorkspaces(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = actorId(res);

  if (userId === null) {
    reject(res, 401, "Authentication required");
    return;
  }

  try {
    if (req.method === "GET" && req.path === "/") {
      const memberships =
        await prisma.workspace_memberships.findMany({
          where: { user_id: userId },
          select: { workspace_id: true },
        });

      const workspaces =
        await prisma.workspaces.findMany({
          where: {
            workspace_id: {
              in: memberships.map(
                (member) => member.workspace_id
              ),
            },
          },
          orderBy: { workspace_id: "asc" },
        });

      res.status(200).json({
        success: true,
        count: workspaces.length,
        data: workspaces.map((workspace) => ({
          id: workspace.workspace_id.toString(),
          name: workspace.name,
          createdAt:
            workspace.created_at.toISOString(),
        })),
      });
      return;
    }

    if (req.method === "POST" && req.path === "/") {
      const parsed = createWorkspaceSchema.safeParse(
        req.body
      );

      if (!parsed.success) {
        reject(res, 400, "Invalid workspace data");
        return;
      }

      // The creator becomes the workspace owner.
      // Both operations succeed or both roll back.
      const workspace = await prisma.$transaction(
        async (tx) => {
          const created = await tx.workspaces.create({
            data: { name: parsed.data.name },
          });

          await tx.workspace_memberships.create({
            data: {
              workspace_id: created.workspace_id,
              user_id: userId,
              role: "owner",
            },
          });

          return created;
        }
      );

      res.status(201).json({
        success: true,
        data: {
          id: workspace.workspace_id.toString(),
          name: workspace.name,
          createdAt:
            workspace.created_at.toISOString(),
        },
      });
      return;
    }

    const projectsPath =
      req.path.match(/^\/([^/]+)\/projects\/?$/);

    if (req.method === "GET" && projectsPath) {
      const workspaceId = parseId(projectsPath[1]);

      if (workspaceId === null) {
        reject(res, 400, "Invalid workspace ID");
        return;
      }

      const membership = await findMembership(
        userId,
        workspaceId
      );

      if (!membership) {
        reject(res, 404, "Workspace not found");
        return;
      }

      next();
      return;
    }

    reject(res, 404, "Route not found");
  } catch (error) {
    next(error);
  }
}

// Secure /api/projects
export async function secureProjects(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = actorId(res);

  if (userId === null) {
    reject(res, 401, "Authentication required");
    return;
  }

  try {
    if (req.method === "POST" && req.path === "/") {
      const parsed = createProjectSchema.safeParse(
        req.body
      );

      if (!parsed.success) {
        reject(res, 400, "Invalid project data");
        return;
      }

      const workspaceId =
        BigInt(parsed.data.workspaceId);

      const membership = await findMembership(
        userId,
        workspaceId
      );

      if (!membership) {
        reject(res, 404, "Workspace not found");
        return;
      }

      if (
        membership.role !== "owner" &&
        membership.role !== "admin"
      ) {
        reject(res, 403, "Insufficient permissions");
        return;
      }

      next();
      return;
    }

    const tasksPath =
      req.path.match(/^\/([^/]+)\/tasks\/?$/);

    if (req.method === "GET" && tasksPath) {
      const projectId = parseId(tasksPath[1]);

      if (projectId === null) {
        reject(res, 400, "Invalid project ID");
        return;
      }

      const workspaceId = await projectWorkspace(
        projectId
      );

      if (
        workspaceId === null ||
        !(await findMembership(userId, workspaceId))
      ) {
        reject(res, 404, "Project not found");
        return;
      }

      next();
      return;
    }

    reject(res, 404, "Route not found");
  } catch (error) {
    next(error);
  }
}

// Secure /api/tasks
export async function secureTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = actorId(res);

  if (userId === null) {
    reject(res, 401, "Authentication required");
    return;
  }

  try {
    if (req.method === "GET" && req.path === "/") {
      // Return ONLY tasks from joined workspaces.
      const memberships =
        await prisma.workspace_memberships.findMany({
          where: { user_id: userId },
          select: { workspace_id: true },
        });

      const projects = await prisma.projects.findMany({
        where: {
          workspace_id: {
            in: memberships.map(
              (member) => member.workspace_id
            ),
          },
        },
        select: { project_id: true },
      });

      const tasks = await prisma.tasks.findMany({
        where: {
          project_id: {
            in: projects.map(
              (project) => project.project_id
            ),
          },
        },
        orderBy: { task_id: "asc" },
      });

      const data = tasks.map((task) => {
        const id = Number(task.task_id);

        if (!Number.isSafeInteger(id)) {
          throw new Error(
            "Task ID exceeds supported API range"
          );
        }

        return {
          id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          projectId: task.project_id.toString(),
          assignedUserId:
            task.assigned_user_id?.toString() ?? null,
          dueDate:
            task.due_date
              ?.toISOString()
              .slice(0, 10) ?? null,
        };
      });

      res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
      return;
    }

    if (req.method === "POST" && req.path === "/") {
      const parsed = createTaskSchema.safeParse(
        req.body
      );

      if (!parsed.success) {
        reject(res, 400, "Invalid task data");
        return;
      }

      const workspaceId = await projectWorkspace(
        BigInt(parsed.data.projectId)
      );

      if (
        workspaceId === null ||
        !(await findMembership(userId, workspaceId))
      ) {
        reject(res, 404, "Project not found");
        return;
      }

      next();
      return;
    }

    const taskPath =
      req.path.match(/^\/([^/]+)\/?$/);

    if (
      taskPath &&
      (req.method === "GET" ||
        req.method === "PATCH")
    ) {
      const taskId = parseId(taskPath[1]);

      if (taskId === null) {
        reject(res, 400, "Invalid task ID");
        return;
      }

      const workspaceId = await taskWorkspace(
        taskId
      );

      if (
        workspaceId === null ||
        !(await findMembership(userId, workspaceId))
      ) {
        reject(res, 404, "Task not found");
        return;
      }

      next();
      return;
    }

    reject(res, 404, "Route not found");
  } catch (error) {
    next(error);
  }
}
