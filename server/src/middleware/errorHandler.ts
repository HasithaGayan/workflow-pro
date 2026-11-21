import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  const reportedStatus =
    typeof error?.status === "number" ? error.status : 500;

  const status =
    reportedStatus >= 400 && reportedStatus < 500
      ? reportedStatus
      : 500;

  console.error("Request error", {
    type: error instanceof Error ? error.name : "Unknown",
    status,
  });

  res.status(status).json({
    success: false,
    error:
      status === 500
        ? "Internal server error"
        : "Invalid request",
  });
};