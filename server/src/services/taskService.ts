
import { prisma } from "../lib/prisma";

import type {
  CreateTaskBody,
  UpdateTaskBody,
} from "../validation/taskSchemas";

export type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  assignedUserId: string | null;
  dueDate: string | null;
};

type DatabaseTask = {
  task_id: bigint;
  title: string;
  status: string;
  priority: string;
  project_id: bigint;
  assigned_user_id: bigint | null;
  due_date: Date | null;
};

export class TaskDomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "TaskDomainError";
  }
}

function toApiTask(record: DatabaseTask): Task {
  const id = Number(record.task_id);

  if (!Number.isSafeInteger(id)) {
    throw new Error("Task ID exceeds supported API range");
  }

  return {
    id,
    title: record.title,
    status: record.status,
    priority: record.priority,
    projectId: record.project_id.toString(),
    assignedUserId:
      record.assigned_user_id?.toString() ?? null,
    dueDate:
      record.due_date?.toISOString().slice(0, 10) ?? null,
  };
}

export async function getAllTasks(): Promise<Task[]> {
  const records = await prisma.tasks.findMany({
    orderBy: { task_id: "asc" },
  });

  return records.map(toApiTask);
}

export async function findTaskById(
  id: number
): Promise<Task | null> {
  const record = await prisma.tasks.findUnique({
    where: { task_id: BigInt(id) },
  });

  return record ? toApiTask(record) : null;
}

// A task's assignee must belong to its project's workspace.
async function checkTaskAssignment(
  projectId: bigint,
  assignedUserId: bigint | null
): Promise<void> {
  const project = await prisma.projects.findUnique({
    where: { project_id: projectId },
    select: { workspace_id: true },
  });

  if (!project) {
    throw new TaskDomainError(404, "Project not found");
  }

  if (assignedUserId === null) {
    return;
  }

  const membership =
    await prisma.workspace_memberships.findFirst({
      where: {
        workspace_id: project.workspace_id,
        user_id: assignedUserId,
      },
    });

  if (!membership) {
    throw new TaskDomainError(
      422,
      "Assignee must belong to the project's workspace"
    );
  }
}

export async function createTask(
  input: CreateTaskBody
): Promise<Task> {
  const projectId = BigInt(input.projectId);

  const assignedUserId =
    input.assignedUserId == null
      ? null
      : BigInt(input.assignedUserId);

  await checkTaskAssignment(projectId, assignedUserId);

  const record = await prisma.tasks.create({
    data: {
      project_id: projectId,
      assigned_user_id: assignedUserId,
      title: input.title,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      due_date: input.dueDate
        ? new Date(`${input.dueDate}T00:00:00.000Z`)
        : null,
    },
  });

  return toApiTask(record);
}

export async function updateTask(
  id: number,
  changes: UpdateTaskBody
): Promise<Task> {
  const existing = await prisma.tasks.findUnique({
    where: { task_id: BigInt(id) },
    select: { project_id: true },
  });

  if (!existing) {
    throw new TaskDomainError(404, "Task not found");
  }

  if (changes.assignedUserId !== undefined) {
    const assignedUserId =
      changes.assignedUserId === null
        ? null
        : BigInt(changes.assignedUserId);

    await checkTaskAssignment(
      existing.project_id,
      assignedUserId
    );
  }

  const record = await prisma.tasks.update({
    where: { task_id: BigInt(id) },
    data: {
      ...(changes.title !== undefined && {
        title: changes.title,
      }),

      ...(changes.status !== undefined && {
        status: changes.status,
      }),

      ...(changes.priority !== undefined && {
        priority: changes.priority,
      }),

      ...(changes.assignedUserId !== undefined && {
        assigned_user_id:
          changes.assignedUserId === null
            ? null
            : BigInt(changes.assignedUserId),
      }),

      ...(changes.dueDate !== undefined && {
        due_date:
          changes.dueDate === null
            ? null
            : new Date(
                `${changes.dueDate}T00:00:00.000Z`
              ),
      }),
    },
  });

  return toApiTask(record);
}
