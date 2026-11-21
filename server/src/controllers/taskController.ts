
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  getAllTasks,
  findTaskById,
} from "../services/taskService";

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
  const rawId = req.params.id;

  if (
    typeof rawId !== "string" ||
    !/^[1-9]\d*$/.test(rawId)
  ) {
    res.status(400).json({
      success: false,
      error: "Invalid task ID",
    });
    return;
  }

  const id = Number(rawId);

  if (!Number.isSafeInteger(id)) {
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
