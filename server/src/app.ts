import express from "express";
import { randomUUID } from "node:crypto";
import { taskRoutes } from "./routes/taskRoutes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.use((req, res, next) => {
  const requestId = randomUUID();
  const started = Date.now();

  res.setHeader("X-Request-ID", requestId);

  res.on("finish", () => {
    console.log({
      requestId,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs: Date.now() - started,
    });
  });

  next();
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "WorkFlow Pro API is running",
  });
});

app.use("/api/tasks", taskRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.use(errorHandler);