
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./board.module.css";

type Status = "todo" | "in_progress" | "done";

type User = {
  fullName: string;
};

type Workspace = {
  id: string | number;
  name: string;
};

type Project = {
  id: string | number;
  name: string;
};

type ApiTask = {
  id: string | number;
  title: string;
  status: string;
  priority: string;
};

type BoardTask = {
  id: string;
  title: string;
  status: Status;
  priority: string;
  projectId: string;
  projectName: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  csrfToken?: string;
  error?: unknown;
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function requestApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(
    `/api/workflow${path}`,
    {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
    }
  );

  const result = (await response
    .json()
    .catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(
      typeof result.error === "string"
        ? result.error
        : `Request failed (${response.status})`,
      response.status
    );
  }

  return result;
}

const statusOrder: Status[] = [
  "todo",
  "in_progress",
  "done",
];

const lanes: {
  status: Status;
  label: string;
  description: string;
}[] = [
  {
    status: "todo",
    label: "To Do",
    description: "Ready to start",
  },
  {
    status: "in_progress",
    label: "In Progress",
    description: "Currently being worked on",
  },
  {
    status: "done",
    label: "Done",
    description: "Successfully completed",
  },
];

const priorityRank: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function parseStatus(value: string): Status {
  const normalized = value.toLowerCase();

  if (
    normalized === "todo" ||
    normalized === "in_progress" ||
    normalized === "done"
  ) {
    return normalized;
  }

  throw new Error(
    `Unsupported task status: ${value}`
  );
}

function labelForStatus(status: Status): string {
  if (status === "todo") return "To Do";
  if (status === "in_progress") {
    return "In Progress";
  }
  return "Done";
}

function completionPercentage(
  done: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function readableError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred";
}

export default function TaskBoardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  const [workspaces, setWorkspaces] =
    useState<Workspace[]>([]);

  const [workspaceId, setWorkspaceId] =
    useState("");

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [tasks, setTasks] =
    useState<BoardTask[]>([]);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [boardLoading, setBoardLoading] =
    useState(false);

  const [savingTaskId, setSavingTaskId] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] =
    useState("all");

  const [priorityFilter, setPriorityFilter] =
    useState("all");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // 1. Authenticate and get this user's workspaces.
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const profile =
          await requestApi<User>("/auth/me");

        if (!profile.data) {
          throw new Error(
            "User profile was not returned"
          );
        }

        const result =
          await requestApi<Workspace[]>(
            "/workspaces"
          );

        if (!active) return;

        const items = result.data ?? [];

        setUser(profile.data);
        setWorkspaces(items);

        if (items.length > 0) {
          setWorkspaceId(String(items[0].id));
        }
      } catch (err) {
        if (!active) return;

        if (
          err instanceof ApiError &&
          err.status === 401
        ) {
          router.replace("/login");
          return;
        }

        setError(readableError(err));
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [router]);

  // 2. Load projects and tasks for the chosen workspace.
  useEffect(() => {
    let active = true;

    setProjects([]);
    setTasks([]);
    setProjectFilter("all");
    setSearch("");
    setError("");
    setNotice("");

    if (!workspaceId) {
      setBoardLoading(false);
      return;
    }

    setBoardLoading(true);

    async function loadBoard() {
      try {
        const projectResponse =
          await requestApi<Project[]>(
            `/workspaces/${workspaceId}/projects`
          );

        const availableProjects =
          projectResponse.data ?? [];

        const taskCollections =
          await Promise.all(
            availableProjects.map(
              async (project): Promise<BoardTask[]> => {
                const response =
                  await requestApi<ApiTask[]>(
                    `/projects/${project.id}/tasks`
                  );

                return (response.data ?? []).map(
                  (task): BoardTask => ({
                    id: String(task.id),
                    title: task.title,
                    status: parseStatus(task.status),
                    priority:
                      task.priority.toLowerCase(),
                    projectId: String(project.id),
                    projectName: project.name,
                  })
                );
              }
            )
          );

        if (!active) return;

        setProjects(availableProjects);
        setTasks(taskCollections.flat());
      } catch (err) {
        if (!active) return;

        if (
          err instanceof ApiError &&
          err.status === 401
        ) {
          router.replace("/login");
          return;
        }

        setError(readableError(err));
      } finally {
        if (active) {
          setBoardLoading(false);
        }
      }
    }

    void loadBoard();

    return () => {
      active = false;
    };
  }, [workspaceId, router]);

  // 3. Filter the tasks without modifying database data.
  const visibleTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const textMatches =
          keyword.length === 0 ||
          task.title.toLowerCase().includes(keyword) ||
          task.projectName
            .toLowerCase()
            .includes(keyword);

        const projectMatches =
          projectFilter === "all" ||
          task.projectId === projectFilter;

        const priorityMatches =
          priorityFilter === "all" ||
          task.priority === priorityFilter;

        return (
          textMatches &&
          projectMatches &&
          priorityMatches
        );
      })
      .sort((a, b) => {
        const aPriority =
          priorityRank[a.priority] ?? 99;

        const bPriority =
          priorityRank[b.priority] ?? 99;

        return (
          aPriority - bPriority ||
          a.title.localeCompare(b.title)
        );
      });
  }, [tasks, search, projectFilter, priorityFilter]);

  const groupedTasks = useMemo(() => {
    const groups: Record<Status, BoardTask[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    visibleTasks.forEach((task) => {
      groups[task.status].push(task);
    });

    return groups;
  }, [visibleTasks]);

  const completedCount = tasks.filter(
    (task) => task.status === "done"
  ).length;

  const completion = completionPercentage(
    completedCount,
    tasks.length
  );

  // 4. Move a real task using session + CSRF protection.
  async function moveTask(
    task: BoardTask,
    nextStatus: Status
  ) {
    if (
      savingTaskId !== null ||
      task.status === nextStatus
    ) {
      return;
    }

    setSavingTaskId(task.id);
    setError("");
    setNotice("");

    try {
      const csrf =
        await requestApi<never>("/auth/csrf");

      if (
        !csrf.csrfToken ||
        !/^[0-9a-f]{64}$/.test(csrf.csrfToken)
      ) {
        throw new Error(
          "Could not verify your login session"
        );
      }

      const response =
        await requestApi<ApiTask>(
          `/tasks/${task.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrf.csrfToken,
            },
            body: JSON.stringify({
              status: nextStatus,
            }),
          }
        );

      if (!response.data) {
        throw new Error(
          "Task update was not confirmed"
        );
      }

      const savedStatus = parseStatus(
        response.data.status
      );

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? { ...item, status: savedStatus }
            : item
        )
      );

      setNotice(
        `"${task.title}" moved to ${
          labelForStatus(savedStatus)
        }`
      );
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 401
      ) {
        router.replace("/login");
      } else {
        setError(readableError(err));
      }
    } finally {
      setSavingTaskId(null);
    }
  }

  if (initialLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.muted}>
            Loading your Task Board...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <h1>Authentication required</h1>
          <p className={styles.muted}>
            {error || "Checking your session..."}
          </p>
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              WORKFLOW PRO / TASK MANAGEMENT
            </p>
            <h1 className={styles.heading}>
              Kanban Task Board
            </h1>
            <p className={styles.muted}>
              Welcome, {user.fullName}. Organize and
              move tasks through your workflow.
            </p>
          </div>

          <Link
            href="/projects"
            className={styles.link}
          >
            Back to Projects
          </Link>
        </header>

        <section className={styles.toolbar}>
          <label className={styles.field}>
            <span>Workspace</span>

            <select
              value={workspaceId}
              disabled={savingTaskId !== null}
              onChange={(event) =>
                setWorkspaceId(event.target.value)
              }
            >
              {workspaces.length === 0 && (
                <option value="">
                  No workspaces
                </option>
              )}

              {workspaces.map((workspace) => (
                <option
                  value={String(workspace.id)}
                  key={String(workspace.id)}
                >
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.progressArea}>
            <div className={styles.progressLabels}>
              <span>Completion</span>
              <strong>{completion}%</strong>
            </div>

            <div
              className={styles.track}
              role="progressbar"
              aria-label="Workspace completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
            >
              <div
                className={styles.fill}
                style={{ width: `${completion}%` }}
              />
            </div>

            <p className={styles.muted}>
              {completedCount} of {tasks.length} tasks done
            </p>
          </div>
        </section>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div
            className={styles.success}
            role="status"
          >
            {notice}
          </div>
        )}

        {workspaces.length === 0 && (
          <div className={styles.emptyNotice}>
            No workspaces found. Create a workspace
            from your{" "}
            <Link href="/dashboard">
              dashboard
            </Link>.
          </div>
        )}

        <section
          className={styles.filters}
          aria-label="Task filters"
        >
          <label className={styles.field}>
            <span>Search</span>
            <input
              type="search"
              placeholder="Search task or project..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <label className={styles.field}>
            <span>Project</span>

            <select
              value={projectFilter}
              onChange={(event) =>
                setProjectFilter(event.target.value)
              }
            >
              <option value="all">
                All projects
              </option>

              {projects.map((project) => (
                <option
                  value={String(project.id)}
                  key={String(project.id)}
                >
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Priority</span>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value)
              }
            >
              <option value="all">
                All priorities
              </option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </section>

        <div className={styles.summary}>
          <span>{visibleTasks.length} tasks shown</span>
          <span>
            {projects.length} projects in this workspace
          </span>
        </div>

        {boardLoading ? (
          <div className={styles.emptyNotice}>
            Loading your project tasks...
          </div>
        ) : (
          <div className={styles.board}>
            {lanes.map((lane) => {
              const laneTasks =
                groupedTasks[lane.status];

              return (
                <section
                  key={lane.status}
                  className={styles.lane}
                  aria-label={`${lane.label} tasks`}
                >
                  <div className={styles.laneHeader}>
                    <div className={styles.laneTitle}>
                      <span
                        className={
                          lane.status === "done"
                            ? styles.greenDot
                            : lane.status ===
                                "in_progress"
                              ? styles.purpleDot
                              : styles.greyDot
                        }
                      />

                      <h2>{lane.label}</h2>
                    </div>

                    <span className={styles.laneCount}>
                      {laneTasks.length}
                    </span>
                  </div>

                  <p className={styles.laneDescription}>
                    {lane.description}
                  </p>

                  <div className={styles.cards}>
                    {laneTasks.length === 0 ? (
                      <p className={styles.emptyLane}>
                        No tasks in this column
                      </p>
                    ) : (
                      laneTasks.map((task) => {
                        const index =
                          statusOrder.indexOf(
                            task.status
                          );

                        const previousStatus =
                          index > 0
                            ? statusOrder[index - 1]
                            : null;

                        const nextStatus =
                          index < statusOrder.length - 1
                            ? statusOrder[index + 1]
                            : null;

                        return (
                          <article
                            className={styles.card}
                            key={task.id}
                          >
                            <div className={styles.cardTop}>
                              <span
                                className={
                                  task.priority === "high"
                                    ? styles.high
                                    : task.priority ===
                                        "medium"
                                      ? styles.medium
                                      : styles.low
                                }
                              >
                                {task.priority} priority
                              </span>

                              <small>#{task.id}</small>
                            </div>

                            <h3 className={styles.taskTitle}>
                              {task.title}
                            </h3>

                            <p className={styles.projectName}>
                              {task.projectName}
                            </p>

                            <div className={styles.actions}>
                              {previousStatus && (
                                <button
                                  type="button"
                                  className={styles.backButton}
                                  disabled={
                                    savingTaskId !== null
                                  }
                                  aria-label={`Move ${task.title} to ${labelForStatus(previousStatus)}`}
                                  onClick={() =>
                                    void moveTask(
                                      task,
                                      previousStatus
                                    )
                                  }
                                >
                                  ← Back
                                </button>
                              )}

                              {nextStatus && (
                                <button
                                  type="button"
                                  className={styles.nextButton}
                                  disabled={
                                    savingTaskId !== null
                                  }
                                  aria-label={`Move ${task.title} to ${labelForStatus(nextStatus)}`}
                                  onClick={() =>
                                    void moveTask(
                                      task,
                                      nextStatus
                                    )
                                  }
                                >
                                  {savingTaskId ===
                                  task.id
                                    ? "Saving..."
                                    : "Move forward →"}
                                </button>
                              )}

                              {!previousStatus &&
                                !nextStatus && (
                                  <span>
                                    No actions available
                                  </span>
                                )}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
