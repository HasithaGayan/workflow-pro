
import { Router } from "express";

import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  registerSchema,
  loginSchema,
} from "../validation/authSchemas";

import {
  AuthDomainError,
  SESSION_COOKIE_NAME,
  createSessionCookie,
  clearSessionCookie,
  registerUser,
  loginUser,
  findSessionUser,
  logoutUser,
} from "../services/authService";

export const authRoutes = Router();

function readSessionCookie(
  req: Request
): string | null {
  const cookies = req.headers.cookie;

  if (!cookies) {
    return null;
  }

  for (const entry of cookies.split(";")) {
    const trimmed = entry.trim();
    const prefix = `${SESSION_COOKIE_NAME}=`;

    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }

  return null;
}

function handleAuthError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof AuthDomainError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  next(error);
}

function sendValidationError(
  res: Response,
  issues: {
    path: PropertyKey[];
    message: string;
  }[]
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

// POST /api/auth/register
authRoutes.post(
  "/register",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const parsed = registerSchema.safeParse(
      req.body
    );

    if (!parsed.success) {
      sendValidationError(
        res,
        parsed.error.issues
      );
      return;
    }

    try {
      const user = await registerUser(
        parsed.data
      );

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      handleAuthError(error, res, next);
    }
  }
);

// POST /api/auth/login
authRoutes.post(
  "/login",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const parsed = loginSchema.safeParse(
      req.body
    );

    if (!parsed.success) {
      sendValidationError(
        res,
        parsed.error.issues
      );
      return;
    }

    try {
      const result = await loginUser(
        parsed.data
      );

      res.setHeader(
        "Set-Cookie",
        createSessionCookie(result.token)
      );

      res.status(200).json({
        success: true,
        data: result.user,
      });
    } catch (error) {
      handleAuthError(error, res, next);
    }
  }
);

// GET /api/auth/me
authRoutes.get(
  "/me",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = readSessionCookie(req);
      const user = await findSessionUser(token);

      if (!user) {
        res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout
authRoutes.post(
  "/logout",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = readSessionCookie(req);

      await logoutUser(token);

      res.setHeader(
        "Set-Cookie",
        clearSessionCookie()
      );

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);
