
import { prisma } from "../lib/prisma";

import type {
  CreateWorkspaceInput,
  CreateProjectInput,
} from "../validation/teamSchemas";

export class TeamDomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "TeamDomainError";
  }
}

type WorkspaceRow = {
  workspace_id: bigint;
  name: string;
  created_at: Date;
};

type ProjectRow = {
  project_id: bigint;
  workspace_id: bigint;
  name: string;
  created_at: Date;
};

function toWorkspace(row: WorkspaceRow) {
  return {
    id: row.workspace_id.toString(),
    name: row.name,
    createdAt: row.created_at.toISOString(),
  };
}

function toProject(row: ProjectRow) {
  return {
    id: row.project_id.toString(),
    workspaceId: row.workspace_id.toString(),
    name: row.name,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createWorkspace(
  input: CreateWorkspaceInput
) {
  const record = await prisma.workspaces.create({
    data: { name: input.name },
  });

  return toWorkspace(record);
}

export async function listWorkspaces() {
  const records = await prisma.workspaces.findMany({
    orderBy: { workspace_id: "asc" },
  });

  return records.map(toWorkspace);
}

export async function createProject(
  input: CreateProjectInput
) {
  const workspaceId = BigInt(input.workspaceId);

  const workspace = await prisma.workspaces.findUnique({
    where: { workspace_id: workspaceId },
  });

  if (!workspace) {
    throw new TeamDomainError(
      404,
      "Workspace not found"
    );
  }

  try {
    const record = await prisma.projects.create({
      data: {
        workspace_id: workspaceId,
        name: input.name,
      },
    });

    return toProject(record);
  } catch (error) {
    // PostgreSQL uniqueness rule:
    // One workspace cannot contain two projects
    // having the same name.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new TeamDomainError(
        409,
        "Project name already exists in this workspace"
      );
    }

    throw error;
  }
}

export async function listWorkspaceProjects(
  workspaceId: bigint
) {
  const workspace = await prisma.workspaces.findUnique({
    where: { workspace_id: workspaceId },
  });

  if (!workspace) {
    throw new TeamDomainError(
      404,
      "Workspace not found"
    );
  }

  const records = await prisma.projects.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { project_id: "asc" },
  });

  return records.map(toProject);
}

export async function listProjectTasks(
  projectId: bigint
) {
  const project = await prisma.projects.findUnique({
    where: { project_id: projectId },
  });

  if (!project) {
    throw new TeamDomainError(
      404,
      "Project not found"
    );
  }

  const records = await prisma.tasks.findMany({
    where: { project_id: projectId },
    orderBy: { task_id: "asc" },
  });

  // Collect user IDs for task assignee names.
  const assigneeIds = records.flatMap((task) =>
    task.assigned_user_id === null
      ? []
      : [task.assigned_user_id]
  );

  const users =
    assigneeIds.length === 0
      ? []
      : await prisma.app_users.findMany({
          where: {
            user_id: { in: assigneeIds },
          },
          select: {
            user_id: true,
            full_name: true,
          },
        });

  const userNames = new Map(
    users.map((user) => [
      user.user_id.toString(),
      user.full_name,
    ])
  );

  const tasks = records.map((task) => {
    const id = Number(task.task_id);

    if (!Number.isSafeInteger(id)) {
      throw new Error(
        "Task ID exceeds supported API range"
      );
    }

    const assigneeId =
      task.assigned_user_id?.toString() ?? null;

    return {
      id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      projectId: task.project_id.toString(),
      assignedUserId: assigneeId,
      assignedTo:
        assigneeId === null
          ? null
          : (userNames.get(assigneeId) ?? null),
      dueDate:
        task.due_date?.toISOString().slice(0, 10) ??
        null,
    };
  });

  return {
    project: toProject(project),
    count: tasks.length,
    data: tasks,
  };
}
