
import type { Request, Response } from "express";
import {
  getAllTasks,
  findTaskById,
} from "../services/taskService";

export function listTasks(_req: Request, res: Response): void {
  const tasks = getAllTasks();

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
}

export function getTaskDetails(req: Request, res: Response): void {
  const rawId = req.params.id;

  // A task ID must be exactly one string containing
  // a positive integer without leading zeros.
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

  const task = findTaskById(id);

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
}
