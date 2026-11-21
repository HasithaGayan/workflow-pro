
import { z } from "zod";

// Safe PostgreSQL BIGINT ID validation
export const idSchema = z.string().refine(
  (id) => {
    // Reject letters, zero, negative numbers and decimals
    if (!/^[1-9]\d*$/.test(id)) {
      return false;
    }

    // Convert only after validating the input
    try {
      return BigInt(id) <= 9223372036854775807n;
    } catch {
      return false;
    }
  },
  {
    message: "ID must be a valid positive PostgreSQL BIGINT",
  }
);

export const createWorkspaceSchema = z.strictObject({
  name: z.string().trim().min(2).max(120),
});

export const createProjectSchema = z.strictObject({
  workspaceId: idSchema,
  name: z.string().trim().min(2).max(150),
});

export type CreateWorkspaceInput =
  z.infer<typeof createWorkspaceSchema>;

export type CreateProjectInput =
  z.infer<typeof createProjectSchema>;
