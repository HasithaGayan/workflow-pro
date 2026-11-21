
import { z } from "zod";

export const idSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "ID must be a positive integer")
  .refine(
    (id) => BigInt(id) <= 9223372036854775807n,
    "ID exceeds PostgreSQL BIGINT range"
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
