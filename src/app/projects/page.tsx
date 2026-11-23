
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "./projects.module.css";

type User = {
  id: string;
  fullName: string;
  email: string;
};

type Workspace = {
  id: string;
  name: string;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: string;
};

type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  assignedUserId?: string | null;
  dueDate?: string | null;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  csrfToken?: string;
  error?: unknown;
};

class ApiFailure extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function apiRequest<T>(
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

  const body: ApiResponse<T> =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiFailure(
      typeof body.error === "string"
        ? body.error
        : `Request failed (${response.status})`,
      response.status
    );
  }

  return body;
}

async function apiWrite<T>(
  path: string,
  method: "POST" | "PATCH",
  data: unknown
): Promise<ApiResponse<T>> {
  const csrf = await apiRequest<never>(
    "/auth/csrf"
  );

  if (
    !csrf.csrfToken ||
    !/^[0-9a-f]{64}$/.test(csrf.csrfToken)
  ) {
    throw new Error(
      "Unable to verify this session"
    );
  }

  return apiRequest<T>(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf.csrfToken,
    },
    body: JSON.stringify(data),
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "todo":
      return "To Do";
    case "in_progress":
      return "In Progress";
    case "done":
      return "Done";
    default:
      return status.replaceAll("_", " ");
  }
}

export default function ProjectsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] =
    useState<Workspace[]>([]);

  const [workspaceId, setWorkspaceId] =
    useState("");

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [projectId, setProjectId] =
    useState("");

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [projectName, setProjectName] =
    useState("");

  const [taskTitle, setTaskTitle] =
    useState("");

  const [taskPriority, setTaskPriority] =
    useState("medium");

  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] =
    useState(false);

  const [loadingTasks, setLoadingTasks] =
    useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleError = useCallback((err: unknown): void => {
    if (
      err instanceof ApiFailure &&
      err.status === 401
    ) {
      router.replace("/login");
      return;
    }

    setError(
      err instanceof Error
        ? err.message
        : "An unexpected error occurred"
    );
  }, [router]);

  // Step 1: Verify the session and load workspaces.
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const profile =
          await apiRequest<User>("/auth/me");

        if (!profile.data) {
          throw new Error("Profile data is missing");
        }

        const result =
          await apiRequest<Workspace[]>(
            "/workspaces"
          );

        if (!active) return;

        setUser(profile.data);
        setWorkspaces(result.data ?? []);

        if (result.data?.length) {
          setLoadingProjects(true);
          setWorkspaceId(result.data[0].id);
        }
      } catch (err) {
        if (!active) return;

        if (
          err instanceof ApiFailure &&
          err.status === 401
        ) {
          router.replace("/login");
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your workspaces"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [router]);

  // Step 2: Load projects for the selected workspace.
  useEffect(() => {
    let active = true;

    if (!workspaceId) return;

    async function loadProjects() {
      try {
        const result =
          await apiRequest<Project[]>(
            `/workspaces/${workspaceId}/projects`
          );

        if (!active) return;

        const items = result.data ?? [];

        setProjects(items);

        if (items.length > 0) {
          setLoadingTasks(true);
          setProjectId(items[0].id);
        }
      } catch (err) {
        if (active) handleError(err);
      } finally {
        if (active) setLoadingProjects(false);
      }
    }

    void loadProjects();

    return () => {
      active = false;
    };
  }, [workspaceId, handleError]);

  // Step 3: Load tasks for the selected project.
  useEffect(() => {
    let active = true;

    if (!projectId) return;

    async function loadTasks() {
      try {
        const result = await apiRequest<Task[]>(
          `/projects/${projectId}/tasks`
        );

        if (active) {
          setTasks(result.data ?? []);
        }
      } catch (err) {
        if (active) handleError(err);
      } finally {
        if (active) setLoadingTasks(false);
      }
    }

    void loadTasks();

    return () => {
      active = false;
    };
  }, [projectId, handleError]);

  async function createProject(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name = projectName.trim();

    if (
      busy ||
      !workspaceId ||
      name.length < 2
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiWrite<Project>(
        "/projects",
        "POST",
        {
          workspaceId,
          name,
        }
      );

      if (!result.data) {
        throw new Error(
          "Project creation returned no data"
        );
      }

      setProjects((previous) => [
        ...previous,
        result.data!,
      ]);

      setTasks([]);
      setLoadingTasks(true);
      setProjectId(result.data.id);
      setProjectName("");

      setSuccess(
        `Project "${result.data.name}" created`
      );
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function createTask(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const title = taskTitle.trim();

    if (
      busy ||
      !projectId ||
      title.length < 2
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiWrite<Task>(
        "/tasks",
        "POST",
        {
          projectId,
          title,
          status: "todo",
          priority: taskPriority,
        }
      );

      if (!result.data) {
        throw new Error(
          "Task creation returned no data"
        );
      }

      setTasks((previous) => [
        ...previous,
        result.data!,
      ]);

      setTaskTitle("");
      setSuccess("Task created successfully");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function changeTaskStatus(
    task: Task,
    status: string
  ) {
    if (busy || task.status === status) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiWrite<Task>(
        `/tasks/${task.id}`,
        "PATCH",
        { status }
      );

      if (!result.data) {
        throw new Error(
          "Task update returned no data"
        );
      }

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? result.data!
            : item
        )
      );

      setSuccess(
        `Task updated to ${statusLabel(status)}`
      );
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  const selectedWorkspace =
    workspaces.find(
      (workspace) => workspace.id === workspaceId
    );

  const selectedProject =
    projects.find(
      (project) => project.id === projectId
    );

  const completedTasks =
    tasks.filter(
      (task) => task.status === "done"
    ).length;

  const inProgressTasks =
    tasks.filter(
      (task) => task.status === "in_progress"
    ).length;

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.muted}>
            Loading your projects...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.muted}>
            {error || "Checking authentication..."}
          </p>

          <Link
            href="/login"
            className={styles.backLink}
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.logo}>
              W
            </span>

            <div>
              <strong>WorkFlow Pro</strong>
              <p className={styles.brandCaption}>
                Project management
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className={styles.backLink}
          >
            ← Back to Dashboard
          </Link>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            PROJECTS & TASKS
          </p>

          <h1 className={styles.heading}>
            Manage your team&apos;s work
          </h1>

          <p className={styles.muted}>
            Welcome, {user.fullName}. Create projects,
            organize tasks and track progress.
          </p>
        </section>

        <section
          className={styles.metrics}
          aria-label="Project statistics"
        >
          <article className={styles.metric}>
            <span>Projects</span>
            <strong>{projects.length}</strong>
          </article>

          <article className={styles.metric}>
            <span>Total tasks</span>
            <strong>{tasks.length}</strong>
          </article>

          <article className={styles.metric}>
            <span>In progress</span>
            <strong>{inProgressTasks}</strong>
          </article>

          <article className={styles.metric}>
            <span>Completed</span>
            <strong>{completedTasks}</strong>
          </article>
        </section>

        {error && (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className={styles.success}
            role="status"
          >
            {success}
          </div>
        )}

        <div className={styles.columns}>
          <section className={styles.panel}>
            <p className={styles.eyebrow}>
              WORKSPACE
            </p>

            <h2 className={styles.sectionTitle}>
              Your projects
            </h2>

            <label
              className={styles.label}
              htmlFor="workspace"
            >
              Select workspace
            </label>

            <select
              id="workspace"
              className={styles.input}
              value={workspaceId}
              onChange={(event) => {
                setError("");
                setSuccess("");
                const nextId = event.target.value;
                if (nextId === workspaceId) return;
                setProjects([]);
                setProjectId("");
                setTasks([]);
                setLoadingTasks(false);
                setLoadingProjects(Boolean(nextId));
                setWorkspaceId(nextId);
              }}
            >
              {workspaces.length === 0 && (
                <option value="">
                  No workspaces
                </option>
              )}

              {workspaces.map((workspace) => (
                <option
                  key={workspace.id}
                  value={workspace.id}
                >
                  {workspace.name}
                </option>
              ))}
            </select>

            {workspaces.length === 0 ? (
              <p className={styles.empty}>
                Create a workspace on your dashboard
                before adding projects.
              </p>
            ) : (
              <>
                <div className={styles.context}>
                  Active workspace:
                  <strong>
                    {selectedWorkspace?.name}
                  </strong>
                </div>

                <form
                  className={styles.form}
                  onSubmit={createProject}
                >
                  <label
                    className={styles.label}
                    htmlFor="projectName"
                  >
                    New project name
                  </label>

                  <input
                    id="projectName"
                    className={styles.input}
                    value={projectName}
                    maxLength={120}
                    minLength={2}
                    required
                    placeholder="e.g. University App"
                    onChange={(event) =>
                      setProjectName(
                        event.target.value
                      )
                    }
                  />

                  <button
                    type="submit"
                    className={styles.button}
                    disabled={busy}
                  >
                    {busy
                      ? "Please wait..."
                      : "+ Create Project"}
                  </button>
                </form>
              </>
            )}

            <div className={styles.sectionDivider} />

            <h3 className={styles.smallHeading}>
              Projects
            </h3>

            {loadingProjects ? (
              <p className={styles.muted}>
                Loading projects...
              </p>
            ) : projects.length === 0 ? (
              <p className={styles.empty}>
                No projects yet. Create your first
                project above.
              </p>
            ) : (
              <div className={styles.projectList}>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={
                      projectId === project.id
                        ? styles.selectedProject
                        : styles.projectItem
                    }
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      if (projectId === project.id) return;
                      setTasks([]);
                      setLoadingTasks(true);
                      setProjectId(project.id);
                    }}
                  >
                    <span className={styles.projectIcon}>
                      <span>▦</span>
                    </span>

                    <span className={styles.projectDetails}>
                      <strong>{project.name}</strong>
                      <small>
                        Project #{project.id}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <p className={styles.eyebrow}>
              TASK MANAGEMENT
            </p>

            <h2 className={styles.sectionTitle}>
              {selectedProject
                ? selectedProject.name
                : "Select a project"}
            </h2>

            <p className={styles.muted}>
              {selectedProject
                ? "Create tasks and update their progress."
                : "Choose a project from the left to manage tasks."}
            </p>

            {selectedProject && (
              <>
                <form
                  className={styles.form}
                  onSubmit={createTask}
                >
                  <label
                    className={styles.label}
                    htmlFor="taskTitle"
                  >
                    Task title
                  </label>

                  <input
                    id="taskTitle"
                    className={styles.input}
                    value={taskTitle}
                    maxLength={200}
                    minLength={2}
                    required
                    placeholder="e.g. Design Database"
                    onChange={(event) =>
                      setTaskTitle(
                        event.target.value
                      )
                    }
                  />

                  <label
                    className={styles.label}
                    htmlFor="priority"
                  >
                    Priority
                  </label>

                  <select
                    id="priority"
                    className={styles.input}
                    value={taskPriority}
                    onChange={(event) =>
                      setTaskPriority(
                        event.target.value
                      )
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>

                  <button
                    type="submit"
                    className={styles.button}
                    disabled={busy}
                  >
                    {busy
                      ? "Please wait..."
                      : "+ Add Task"}
                  </button>
                </form>

                <div
                  className={styles.sectionDivider}
                />

                <div className={styles.taskHeading}>
                  <h3 className={styles.smallHeading}>
                    Project tasks
                  </h3>
                  <span>
                    {tasks.length} total
                  </span>
                </div>

                {loadingTasks ? (
                  <p className={styles.muted}>
                    Loading tasks...
                  </p>
                ) : tasks.length === 0 ? (
                  <p className={styles.empty}>
                    No tasks yet. Add your first task.
                  </p>
                ) : (
                  <div className={styles.taskList}>
                    {tasks.map((task) => (
                      <article
                        key={task.id}
                        className={styles.task}
                      >
                        <div className={styles.taskInfo}>
                          <strong>
                            {task.title}
                          </strong>

                          <div className={styles.taskMeta}>
                            <span>
                              #{task.id}
                            </span>

                            <span
                              className={
                                task.priority === "high"
                                  ? styles.highPriority
                                  : styles.priority
                              }
                            >
                              {task.priority}
                            </span>
                          </div>
                        </div>

                        <label
                          className={styles.statusControl}
                        >
                          <span>Status</span>

                          <select
                            className={styles.statusSelect}
                            value={task.status}
                            disabled={busy}
                            onChange={(event) => {
                              void changeTaskStatus(
                                task,
                                event.target.value
                              );
                            }}
                          >
                            <option value="todo">
                              To Do
                            </option>

                            <option value="in_progress">
                              In Progress
                            </option>

                            <option value="done">
                              Done
                            </option>
                          </select>
                        </label>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
