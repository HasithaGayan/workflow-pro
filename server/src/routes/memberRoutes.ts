
import { Router } from "express";
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

export const memberRoutes = Router();

const MAX_ID = BigInt("9223372036854775807");

type Role = "owner" | "admin" | "member";
type AssignableRole = "admin" | "member";

type Authorized = {
  workspaceId: bigint;
  actorId: bigint;
  role: Role;
};

function parseId(value: unknown): bigint | null {
  if (
    typeof value !== "string" ||
    !/^[1-9][0-9]*$/.test(value)
  ) {
    return null;
  }

  const id = BigInt(value);

  return id <= MAX_ID ? id : null;
}

function sendError(
  res: Response,
  status: number,
  message: string
): void {
  res.status(status).json({
    success: false,
    error: message,
  });
}

function readSessionCookie(
  req: Request
): string | null {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) return null;

  const prefix = `${SESSION_COOKIE_NAME}=`;

  for (const part of cookieHeader.split(";")) {
    const cookie = part.trim();

    if (cookie.startsWith(prefix)) {
      const token = cookie.slice(prefix.length);

      return /^[0-9a-f]{64}$/.test(token)
        ? token
        : null;
    }
  }

  return null;
}

function parseAssignableRole(
  value: unknown
): AssignableRole | null {
  if (value === "admin" || value === "member") {
    return value;
  }

  return null;
}

function hasOnlyKeys(
  value: unknown,
  allowed: string[]
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  return Object.keys(value).every((key) =>
    allowed.includes(key)
  );
}

async function authorize(
  req: Request,
  res: Response,
  ownerRequired: boolean
): Promise<Authorized | null> {
  const workspaceId = parseId(
    req.params.workspaceId
  );

  if (workspaceId === null) {
    sendError(res, 400, "Invalid workspace ID");
    return null;
  }

  const sessionToken = readSessionCookie(req);

  if (!sessionToken) {
    sendError(res, 401, "Authentication required");
    return null;
  }

  const user = await findSessionUser(sessionToken);

  if (!user) {
    sendError(res, 401, "Authentication required");
    return null;
  }

  const actorId = parseId(user.id);

  if (actorId === null) {
    sendError(res, 401, "Invalid login session");
    return null;
  }

  const membership =
    await prisma.workspace_memberships.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: actorId,
        },
      },
    });

  // Do not reveal private workspaces to nonmembers.
  if (!membership) {
    sendError(res, 404, "Workspace not found");
    return null;
  }

  const role = membership.role as Role;

  if (
    role !== "owner" &&
    role !== "admin" &&
    role !== "member"
  ) {
    sendError(res, 403, "Invalid membership role");
    return null;
  }

  if (ownerRequired && role !== "owner") {
    sendError(
      res,
      403,
      "Only the workspace owner can manage members"
    );

    return null;
  }

  return { workspaceId, actorId, role };
}

function respondUnexpected(
  error: unknown,
  next: NextFunction
): void {
  next(error);
}

// Never cache private team membership information.
memberRoutes.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// GET /api/team-members/:workspaceId
// All current members can view the directory.
memberRoutes.get(
  "/:workspaceId",
  async (req, res, next) => {
    try {
      const auth = await authorize(req, res, false);

      if (!auth) return;

      const records =
        await prisma.workspace_memberships.findMany({
          where: {
            workspace_id: auth.workspaceId,
          },
          include: {
            app_users: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
              },
            },
          },
        });

      const members = records
        .map((record) => ({
          userId: record.user_id.toString(),
          fullName: record.app_users.full_name,
          email: record.app_users.email,
          role: record.role,
        }))
        .sort((a, b) => {
          if (a.role === "owner") return -1;
          if (b.role === "owner") return 1;

          return a.fullName.localeCompare(
            b.fullName
          );
        });

      res.status(200).json({
        success: true,
        count: members.length,
        data: members,
      });
    } catch (error) {
      respondUnexpected(error, next);
    }
  }
);

// POST /api/team-members/:workspaceId
// Body: { email: "...", role: "member" | "admin" }
memberRoutes.post(
  "/:workspaceId",
  async (req, res, next) => {
    try {
      const auth = await authorize(req, res, true);

      if (!auth) return;

      if (
        !hasOnlyKeys(req.body, ["email", "role"]) ||
        Object.keys(req.body).length !== 2
      ) {
        sendError(res, 400, "Invalid request data");
        return;
      }

      const { email, role } = req.body;

      if (
        typeof email !== "string" ||
        email.length > 255
      ) {
        sendError(res, 400, "Invalid email address");
        return;
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          normalizedEmail
        )
      ) {
        sendError(res, 400, "Invalid email address");
        return;
      }

      const targetRole = parseAssignableRole(role);

      if (!targetRole) {
        sendError(res, 400, "Invalid team role");
        return;
      }

      const user = await prisma.app_users.findUnique({
        where: {
          email: normalizedEmail,
        },
        select: {
          user_id: true,
          full_name: true,
          email: true,
        },
      });

      if (!user) {
        sendError(
          res,
          404,
          "Registered user not found"
        );
        return;
      }

      // Original demo users may not have login credentials.
      // Do not invite accounts that cannot sign in.
      const credentials =
        await prisma.auth_credentials.findUnique({
          where: {
            user_id: user.user_id,
          },
          select: {
            user_id: true,
          },
        });

      if (!credentials) {
        sendError(
          res,
          404,
          "Registered user not found"
        );
        return;
      }

      const existing =
        await prisma.workspace_memberships.findUnique({
          where: {
            workspace_id_user_id: {
              workspace_id: auth.workspaceId,
              user_id: user.user_id,
            },
          },
        });

      if (existing) {
        sendError(
          res,
          409,
          "User is already a workspace member"
        );
        return;
      }

      try {
        await prisma.workspace_memberships.create({
          data: {
            workspace_id: auth.workspaceId,
            user_id: user.user_id,
            role: targetRole,
          },
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          sendError(
            res,
            409,
            "User is already a workspace member"
          );
          return;
        }

        throw error;
      }

      res.status(201).json({
        success: true,
        data: {
          userId: user.user_id.toString(),
          fullName: user.full_name,
          email: user.email,
          role: targetRole,
        },
      });
    } catch (error) {
      respondUnexpected(error, next);
    }
  }
);

// PATCH /api/team-members/:workspaceId/:userId
// Body: { role: "member" | "admin" }
memberRoutes.patch(
  "/:workspaceId/:userId",
  async (req, res, next) => {
    try {
      const auth = await authorize(req, res, true);

      if (!auth) return;

      const targetId = parseId(req.params.userId);

      if (targetId === null) {
        sendError(res, 400, "Invalid user ID");
        return;
      }

      if (
        !hasOnlyKeys(req.body, ["role"]) ||
        Object.keys(req.body).length !== 1
      ) {
        sendError(res, 400, "Invalid request data");
        return;
      }

      const targetRole = parseAssignableRole(
        req.body.role
      );

      if (!targetRole) {
        sendError(res, 400, "Invalid team role");
        return;
      }

      const current =
        await prisma.workspace_memberships.findUnique({
          where: {
            workspace_id_user_id: {
              workspace_id: auth.workspaceId,
              user_id: targetId,
            },
          },
        });

      if (!current) {
        sendError(res, 404, "Member not found");
        return;
      }

      // Ownership transfers are not part of Day 53.
      if (current.role === "owner") {
        sendError(
          res,
          403,
          "The workspace owner role cannot be changed"
        );
        return;
      }

      const result =
        await prisma.workspace_memberships.updateMany({
          where: {
            workspace_id: auth.workspaceId,
            user_id: targetId,
            role: {
              in: ["admin", "member"],
            },
          },
          data: {
            role: targetRole,
          },
        });

      if (result.count !== 1) {
        sendError(
          res,
          409,
          "Membership changed. Please refresh."
        );
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          userId: targetId.toString(),
          role: targetRole,
        },
      });
    } catch (error) {
      respondUnexpected(error, next);
    }
  }
);

// DELETE /api/team-members/:workspaceId/:userId
// Remove a member, never the workspace owner.
memberRoutes.delete(
  "/:workspaceId/:userId",
  async (req, res, next) => {
    try {
      const auth = await authorize(req, res, true);

      if (!auth) return;

      const targetId = parseId(req.params.userId);

      if (targetId === null) {
        sendError(res, 400, "Invalid user ID");
        return;
      }

      const current =
        await prisma.workspace_memberships.findUnique({
          where: {
            workspace_id_user_id: {
              workspace_id: auth.workspaceId,
              user_id: targetId,
            },
          },
        });

      if (!current) {
        sendError(res, 404, "Member not found");
        return;
      }

      if (current.role === "owner") {
        sendError(
          res,
          403,
          "The workspace owner cannot be removed"
        );
        return;
      }

      const result =
        await prisma.workspace_memberships.deleteMany({
          where: {
            workspace_id: auth.workspaceId,
            user_id: targetId,
            role: {
              in: ["admin", "member"],
            },
          },
        });

      if (result.count !== 1) {
        sendError(
          res,
          409,
          "Membership changed. Please refresh."
        );
        return;
      }

      res.status(200).json({
        success: true,
        message: "Workspace member removed",
      });
    } catch (error) {
      respondUnexpected(error, next);
    }
  }
);
