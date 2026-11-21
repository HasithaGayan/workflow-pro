
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createTask,
  findTaskById,
  getAllTasks,
  TaskDomainError,
  updateTask,
} from "../services/taskService";

import {
  createTaskSchema,
  updateTaskSchema,
} from "../validation/taskSchemas";

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof TaskDomainError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  next(error);
}

function parseTaskId(rawId: string | string[]): number | null {
  if (
    typeof rawId !== "string" ||
    !/^[1-9]\d*$/.test(rawId)
  ) {
    return null;
  }

  const id = Number(rawId);

  return Number.isSafeInteger(id) ? id : null;
}

export async function listTasks(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tasks = await getAllTasks();

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTaskDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const id = parseTaskId(req.params.id);

  if (id === null) {
    res.status(400).json({
      success: false,
      error: "Invalid task ID",
    });
    return;
  }

  try {
    const task = await findTaskById(id);

    if (!task) {
      res.status(404).json({
        success: false,
        error: "Task not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function createTaskHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const parsed = createTaskSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid task data",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const task = await createTask(parsed.data);

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function updateTaskHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const id = parseTaskId(req.params.id);

  if (id === null) {
    res.status(400).json({
      success: false,
      error: "Invalid task ID",
    });
    return;
  }

  const parsed = updateTaskSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid task data",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const task = await updateTask(id, parsed.data);

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}
