
import { prisma } from "../lib/prisma";

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

function toApiTask(row: DatabaseTask): Task {
  const id = Number(row.task_id);

  if (!Number.isSafeInteger(id)) {
    throw new Error("Task ID exceeds supported API range");
  }

  return {
    id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    projectId: row.project_id.toString(),
    assignedUserId: row.assigned_user_id?.toString() ?? null,
    dueDate: row.due_date?.toISOString().slice(0, 10) ?? null,
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
