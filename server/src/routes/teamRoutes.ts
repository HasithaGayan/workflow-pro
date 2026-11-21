
import { Router } from "express";

import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createWorkspaceSchema,
  createProjectSchema,
  idSchema,
} from "../validation/teamSchemas";

import {
  TeamDomainError,
  createWorkspace,
  listWorkspaces,
  createProject,
  listWorkspaceProjects,
  listProjectTasks,
} from "../services/teamService";

export const workspaceRoutes = Router();
export const projectRoutes = Router();

function handleTeamError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof TeamDomainError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  next(error);
}

function parseId(value: unknown): bigint | null {
  const parsed = idSchema.safeParse(value);
  return parsed.success ? BigInt(parsed.data) : null;
}

function rejectInvalidBody(
  res: Response,
  issues: { path: PropertyKey[]; message: string }[]
): void {
  res.status(400).json({
    success: false,
    error: "Invalid request data",
    details: issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      message: issue.message,
    })),
  });
}

// POST /api/workspaces
workspaceRoutes.post(
  "/",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const parsed = createWorkspaceSchema.safeParse(
      req.body
    );

    if (!parsed.success) {
      rejectInvalidBody(res, parsed.error.issues);
      return;
    }

    try {
      const workspace = await createWorkspace(
        parsed.data
      );

      res.status(201).json({
        success: true,
        data: workspace,
      });
    } catch (error) {
      handleTeamError(error, res, next);
    }
  }
);

// GET /api/workspaces
workspaceRoutes.get(
  "/",
  async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const workspaces = await listWorkspaces();

      res.status(200).json({
        success: true,
        count: workspaces.length,
        data: workspaces,
      });
    } catch (error) {
      handleTeamError(error, res, next);
    }
  }
);

// GET /api/workspaces/:id/projects
workspaceRoutes.get(
  "/:id/projects",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parseId(req.params.id);

    if (id === null) {
      res.status(400).json({
        success: false,
        error: "Invalid workspace ID",
      });
      return;
    }

    try {
      const projects = await listWorkspaceProjects(
        id
      );

      res.status(200).json({
        success: true,
        count: projects.length,
        data: projects,
      });
    } catch (error) {
      handleTeamError(error, res, next);
    }
  }
);

// POST /api/projects
projectRoutes.post(
  "/",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const parsed = createProjectSchema.safeParse(
      req.body
    );

    if (!parsed.success) {
      rejectInvalidBody(res, parsed.error.issues);
      return;
    }

    try {
      const project = await createProject(
        parsed.data
      );

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      handleTeamError(error, res, next);
    }
  }
);

// GET /api/projects/:id/tasks
projectRoutes.get(
  "/:id/tasks",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parseId(req.params.id);

    if (id === null) {
      res.status(400).json({
        success: false,
        error: "Invalid project ID",
      });
      return;
    }

    try {
      const result = await listProjectTasks(id);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      handleTeamError(error, res, next);
    }
  }
);
