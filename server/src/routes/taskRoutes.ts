
import { Router } from "express";

import {
  listTasks,
  getTaskDetails,
  createTaskHandler,
  updateTaskHandler,
} from "../controllers/taskController";

export const taskRoutes = Router();

// Existing read endpoints
taskRoutes.get("/", listTasks);
taskRoutes.get("/:id", getTaskDetails);

// Day 44 — database write endpoints
taskRoutes.post("/", createTaskHandler);
taskRoutes.patch("/:id", updateTaskHandler);
