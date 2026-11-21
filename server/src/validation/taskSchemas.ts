
import { z } from "zod";

const databaseId = z
  .string()
  .regex(/^[1-9]\d*$/, "Must be a positive integer string")
  .refine(
    (value) => BigInt(value) <= 9223372036854775807n,
    "ID is too large"
  );

export const createTaskSchema = z.strictObject({
  projectId: databaseId,

  title: z.string().trim().min(1).max(200),

  assignedUserId: databaseId.nullable().optional(),

  status: z.enum(["todo", "in_progress", "done"]).optional(),

  priority: z.enum(["low", "medium", "high"]).optional(),

  dueDate: z.iso.date().nullable().optional(),
});

export const updateTaskSchema = createTaskSchema
  .omit({ projectId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export type CreateTaskBody = z.infer<typeof createTaskSchema>;

export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
