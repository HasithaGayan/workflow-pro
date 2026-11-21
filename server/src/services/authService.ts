
import {
  Algorithm,
  hash,
  verify,
} from "@node-rs/argon2";

import {
  createHash,
  randomBytes,
} from "node:crypto";

import { prisma } from "../lib/prisma";

import type {
  LoginInput,
  RegisterInput,
} from "../validation/authSchemas";

const SESSION_DURATION_MS =
  7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-workflow_session"
    : "workflow_session";

export class AuthDomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AuthDomainError";
  }
}

type UserRecord = {
  user_id: bigint;
  full_name: string;
  email: string;
};

function toPublicUser(user: UserRecord) {
  return {
    id: user.user_id.toString(),
    fullName: user.full_name,
    email: user.email,
  };
}

function hashToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function cookieAttributes(): string {
  const secure =
    process.env.NODE_ENV === "production"
      ? "; Secure"
      : "";

  return `Path=/; HttpOnly; SameSite=Strict${secure}`;
}

export function createSessionCookie(
  token: string
): string {
  const maxAge = Math.floor(
    SESSION_DURATION_MS / 1000
  );

  return (
    `${SESSION_COOKIE_NAME}=${token}; ` +
    `Max-Age=${maxAge}; ` +
    cookieAttributes()
  );
}

export function clearSessionCookie(): string {
  return (
    `${SESSION_COOKIE_NAME}=; ` +
    `Max-Age=0; ` +
    cookieAttributes()
  );
}

// Register a new account.
// The user and password hash are saved together.
export async function registerUser(
  input: RegisterInput
) {
  const passwordHash = await hash(input.password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const user =
          await transaction.app_users.create({
            data: {
              full_name: input.fullName,
              email: input.email,
            },
          });

        await transaction.auth_credentials.create({
          data: {
            user_id: user.user_id,
            password_hash: passwordHash,
          },
        });

        return toPublicUser(user);
      }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new AuthDomainError(
        409,
        "Email is already registered"
      );
    }

    throw error;
  }
}

// Verify credentials, then create a fresh session.
export async function loginUser(
  input: LoginInput
) {
  const user = await prisma.app_users.findUnique({
    where: { email: input.email },
  });

  const credentials = user
    ? await prisma.auth_credentials.findUnique({
        where: { user_id: user.user_id },
      })
    : null;

  if (!user || !credentials) {
    throw new AuthDomainError(
      401,
      "Invalid email or password"
    );
  }

  const passwordValid = await verify(
    credentials.password_hash,
    input.password
  );

  if (!passwordValid) {
    throw new AuthDomainError(
      401,
      "Invalid email or password"
    );
  }

  // A new cryptographically random token for each login.
  const token = randomBytes(32).toString("hex");

  await prisma.auth_sessions.create({
    data: {
      user_id: user.user_id,
      token_hash: hashToken(token),
      expires_at: new Date(
        Date.now() + SESSION_DURATION_MS
      ),
    },
  });

  return {
    user: toPublicUser(user),
    token,
  };
}

// Read the current user from a valid session token.
export async function findSessionUser(
  token: string | null
) {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return null;
  }

  const session =
    await prisma.auth_sessions.findUnique({
      where: { token_hash: hashToken(token) },
    });

  if (!session) {
    return null;
  }

  if (session.expires_at.getTime() <= Date.now()) {
    await prisma.auth_sessions.deleteMany({
      where: {
        session_id: session.session_id,
      },
    });

    return null;
  }

  const user = await prisma.app_users.findUnique({
    where: { user_id: session.user_id },
  });

  return user ? toPublicUser(user) : null;
}

// Invalidate the session on the server.
export async function logoutUser(
  token: string | null
): Promise<void> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return;
  }

  await prisma.auth_sessions.deleteMany({
    where: {
      token_hash: hashToken(token),
    },
  });
}
