import { Router } from "express";
import {
  listTasks,
  getTaskDetails,
} from "../controllers/taskController";

export const taskRoutes = Router();

taskRoutes.get("/", listTasks);
taskRoutes.get("/:id", getTaskDetails);