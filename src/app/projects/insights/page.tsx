
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./insights.module.css";

type Workspace = {
  id: string | number;
  name: string;
};

type Project = {
  id: string | number;
  name: string;
};

type TaskFromApi = {
  id: string | number;
  title: string;
  status: string;
  priority: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  projectName: string;
};

type User = {
  fullName: string;
};

type ApiEnvelope<T> = {
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
): Promise<ApiEnvelope<T>> {
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
    .catch(() => ({}))) as ApiEnvelope<T>;

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

function percentage(
  completed: number,
  total: number
): number {
  return total === 0
    ? 0
    : Math.round((completed / total) * 100);
}

function displayStatus(status: string): string {
  if (status === "todo") return "To Do";
  if (status === "in_progress") return "In Progress";
  if (status === "done") return "Done";
  return status.replaceAll("_", " ");
}

const statusChoices = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const priorityRank: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export default function TaskInsightsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] =
    useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [initialLoading, setInitialLoading] =
    useState(true);
  const [taskLoading, setTaskLoading] = useState(false);
  const [savingTaskId, setSavingTaskId] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] =
    useState("all");
  const [priorityFilter, setPriorityFilter] =
    useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const profile = await requestApi<User>(
          "/auth/me"
        );

        if (!profile.data) {
          throw new Error("Profile data is missing");
        }

        const workspacesResponse =
          await requestApi<Workspace[]>(
            "/workspaces"
          );

        if (!active) return;

        setUser(profile.data);

        const available =
          workspacesResponse.data ?? [];

        setWorkspaces(available);

        if (available.length > 0) {
          setWorkspaceId(String(available[0].id));
        }
      } catch (err) {
        if (!active) return;

        if (
          err instanceof ApiError &&
          err.status === 401
        ) {
          router.replace("/login");
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your account"
          );
        }
      } finally {
        if (active) setInitialLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;

    setProjects([]);
    setTasks([]);
    setProjectFilter("all");
    setError("");
    setNotice("");

    if (!workspaceId) {
      setTaskLoading(false);
      return;
    }

    setTaskLoading(true);

    async function loadWorkspaceTasks() {
      try {
        const projectsResponse =
          await requestApi<Project[]>(
            `/workspaces/${workspaceId}/projects`
          );

        const availableProjects =
          projectsResponse.data ?? [];

        const projectTasks = await Promise.all(
          availableProjects.map(async (project) => {
            const response =
              await requestApi<TaskFromApi[]>(
                `/projects/${project.id}/tasks`
              );

            return (response.data ?? []).map(
              (task): Task => ({
                id: String(task.id),
                title: task.title,
                status: task.status.toLowerCase(),
                priority: task.priority.toLowerCase(),
                projectId: String(project.id),
                projectName: project.name,
              })
            );
          })
        );

        if (!active) return;

        setProjects(availableProjects);
        setTasks(projectTasks.flat());
      } catch (err) {
        if (!active) return;

        if (
          err instanceof ApiError &&
          err.status === 401
        ) {
          router.replace("/login");
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load workspace tasks"
          );
        }
      } finally {
        if (active) setTaskLoading(false);
      }
    }

    void loadWorkspaceTasks();

    return () => {
      active = false;
    };
  }, [workspaceId, router]);

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = tasks.filter((task) => {
      const matchesText =
        !keyword ||
        task.title.toLowerCase().includes(keyword) ||
        task.projectName.toLowerCase().includes(keyword);

      const matchesProject =
        projectFilter === "all" ||
        task.projectId === projectFilter;

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      return (
        matchesText &&
        matchesProject &&
        matchesStatus &&
        matchesPriority
      );
    });

    result.sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }

      if (sortBy === "priority") {
        return (
          (priorityRank[a.priority] ?? 99) -
            (priorityRank[b.priority] ?? 99) ||
          a.title.localeCompare(b.title)
        );
      }

      if (sortBy === "status") {
        return (
          a.status.localeCompare(b.status) ||
          a.title.localeCompare(b.title)
        );
      }

      // Numeric comparison without converting large IDs.
      return b.id.localeCompare(a.id, undefined, {
        numeric: true,
      });
    });

    return result;
  }, [
    tasks,
    search,
    projectFilter,
    statusFilter,
    priorityFilter,
    sortBy,
  ]);

  const todoCount = tasks.filter(
    (task) => task.status === "todo"
  ).length;

  const activeCount = tasks.filter(
    (task) => task.status === "in_progress"
  ).length;

  const doneCount = tasks.filter(
    (task) => task.status === "done"
  ).length;

  const completion = percentage(
    doneCount,
    tasks.length
  );

  async function changeStatus(
    task: Task,
    nextStatus: string
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
      const csrf = await requestApi<never>(
        "/auth/csrf"
      );

      if (
        !csrf.csrfToken ||
        !/^[0-9a-f]{64}$/.test(csrf.csrfToken)
      ) {
        throw new Error(
          "Could not verify your session"
        );
      }

      const updated =
        await requestApi<TaskFromApi>(
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

      if (!updated.data) {
        throw new Error(
          "The server did not confirm the update"
        );
      }

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status:
                  updated.data!.status.toLowerCase(),
              }
            : item
        )
      );

      setNotice(
        `"${task.title}" updated to ${displayStatus(
          nextStatus
        )}`
      );
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 401
      ) {
        router.replace("/login");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to update the task"
        );
      }
    } finally {
      setSavingTaskId(null);
    }
  }

  if (initialLoading) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>
          Loading Task Insights...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <h1>Sign in required</h1>
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
              WORKFLOW PRO / ANALYTICS
            </p>
            <h1 className={styles.heading}>
              Task Insights
            </h1>
            <p className={styles.muted}>
              Manage priorities, track completion and
              find your team's tasks quickly.
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

          <div className={styles.userNote}>
            Signed in as <strong>{user.fullName}</strong>
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

        <section
          className={styles.metrics}
          aria-label="Task summary"
        >
          {[
            { label: "All tasks", value: tasks.length },
            { label: "To Do", value: todoCount },
            { label: "In Progress", value: activeCount },
            { label: "Completed", value: doneCount },
          ].map((metric) => (
            <article
              className={styles.metric}
              key={metric.label}
            >
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className={styles.panel}>
          <div className={styles.progressHeading}>
            <div>
              <p className={styles.eyebrow}>
                OVERALL PERFORMANCE
              </p>
              <h2>Workspace completion</h2>
            </div>
            <strong className={styles.percent}>
              {completion}%
            </strong>
          </div>

          <div
            className={styles.track}
            role="progressbar"
            aria-label="Workspace task completion"
            aria-valuenow={completion}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={styles.fill}
              style={{ width: `${completion}%` }}
            />
          </div>

          <p className={styles.muted}>
            {doneCount} of {tasks.length} tasks completed
          </p>
        </section>

        <div className={styles.columns}>
          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2>Task explorer</h2>
              <span className={styles.count}>
                {filteredTasks.length} shown
              </span>
            </div>

            <div className={styles.filters}>
              <label className={styles.field}>
                <span>Search tasks</span>
                <input
                  type="search"
                  value={search}
                  placeholder="Search by task or project..."
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
                      key={String(project.id)}
                      value={String(project.id)}
                    >
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="all">
                    All statuses
                  </option>
                  {statusChoices.map((status) => (
                    <option
                      value={status.value}
                      key={status.value}
                    >
                      {status.label}
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

              <label className={styles.field}>
                <span>Sort</span>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value)
                  }
                >
                  <option value="newest">
                    Newest task ID
                  </option>
                  <option value="title">
                    Title A–Z
                  </option>
                  <option value="priority">
                    Highest priority
                  </option>
                  <option value="status">
                    Status A–Z
                  </option>
                </select>
              </label>
            </div>

            {taskLoading ? (
              <p className={styles.empty}>
                Loading projects and tasks...
              </p>
            ) : filteredTasks.length === 0 ? (
              <p className={styles.empty}>
                No tasks match these filters.
                Use Projects & Tasks to add more work.
              </p>
            ) : (
              <div className={styles.taskList}>
                {filteredTasks.map((task) => (
                  <article
                    className={styles.taskCard}
                    key={task.id}
                  >
                    <div className={styles.taskDetails}>
                      <strong>{task.title}</strong>
                      <p className={styles.muted}>
                        {task.projectName}
                      </p>

                      <span
                        className={
                          task.priority === "high"
                            ? styles.highPriority
                            : styles.priority
                        }
                      >
                        {task.priority} priority
                      </span>
                    </div>

                    <label className={styles.field}>
                      <span>Status</span>

                      <select
                        value={task.status}
                        disabled={
                          savingTaskId !== null
                        }
                        onChange={(event) =>
                          void changeStatus(
                            task,
                            event.target.value
                          )
                        }
                      >
                        {!statusChoices.some(
                          (choice) =>
                            choice.value === task.status
                        ) && (
                          <option value={task.status}>
                            {displayStatus(task.status)}
                          </option>
                        )}

                        {statusChoices.map((choice) => (
                          <option
                            key={choice.value}
                            value={choice.value}
                          >
                            {choice.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className={styles.panel}>
            <p className={styles.eyebrow}>
              PROJECT HEALTH
            </p>
            <h2>Progress by project</h2>

            {taskLoading ? (
              <p className={styles.muted}>
                Loading projects...
              </p>
            ) : projects.length === 0 ? (
              <p className={styles.empty}>
                No projects in this workspace.
              </p>
            ) : (
              <div className={styles.projectList}>
                {projects.map((project) => {
                  const projectTasks = tasks.filter(
                    (task) =>
                      task.projectId ===
                      String(project.id)
                  );

                  const finished = projectTasks.filter(
                    (task) => task.status === "done"
                  ).length;

                  const progress = percentage(
                    finished,
                    projectTasks.length
                  );

                  return (
                    <div
                      className={styles.projectProgress}
                      key={String(project.id)}
                    >
                      <div className={styles.progressHeading}>
                        <strong>{project.name}</strong>
                        <span>{progress}%</span>
                      </div>

                      <div
                        className={styles.track}
                        role="progressbar"
                        aria-label={`${project.name} completion`}
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={styles.fill}
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      <p className={styles.muted}>
                        {finished}/{projectTasks.length}
                        {" "}tasks completed
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
