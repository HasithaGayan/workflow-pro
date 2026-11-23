
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./team.module.css";

type User = {
  id: string | number;
  fullName: string;
  email: string;
};

type Workspace = {
  id: string | number;
  name: string;
};

type Role = "owner" | "admin" | "member";
type NewRole = "admin" | "member";

type Member = {
  userId: string;
  fullName: string;
  email: string;
  role: Role;
};

type ApiResult<T> = {
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

async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
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
    .catch(() => ({}))) as ApiResult<T>;

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

async function secureWrite<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<ApiResult<T>> {
  // Fetch the CSRF token belonging to this login session.
  const csrf = await api<never>("/auth/csrf");

  if (
    !csrf.csrfToken ||
    !/^[0-9a-f]{64}$/.test(csrf.csrfToken)
  ) {
    throw new Error("Unable to verify your session");
  }

  return api<T>(path, {
    method,
    headers: {
      "X-CSRF-Token": csrf.csrfToken,
      ...(body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function TeamPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<
    Workspace[]
  >([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] =
    useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] =
    useState<NewRole>("member");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleError(err: unknown) {
    if (
      err instanceof ApiError &&
      err.status === 401
    ) {
      router.replace("/login");
      return;
    }

    setError(errorMessage(err));
  }

  // Load signed-in user and available workspaces.
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const profile = await api<User>("/auth/me");

        if (!profile.data) {
          throw new Error("User profile is missing");
        }

        const workspacesResult =
          await api<Workspace[]>("/workspaces");

        if (!active) return;

        const available = workspacesResult.data ?? [];

        setUser(profile.data);
        setWorkspaces(available);

        if (available.length > 0) {
          setMembersLoading(true);
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
          setError(errorMessage(err));
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

  // Read the team directory for the selected workspace.
  useEffect(() => {
    let active = true;

    if (!workspaceId) return;

    async function loadMembers() {
      try {
        const result = await api<Member[]>(
          `/team-members/${workspaceId}`
        );

        if (active) {
          setMembers(result.data ?? []);
        }
      } catch (err) {
        if (!active) return;

        if (
          err instanceof ApiError &&
          err.status === 401
        ) {
          router.replace("/login");
        } else {
          setError(errorMessage(err));
        }
      } finally {
        if (active) setMembersLoading(false);
      }
    }

    void loadMembers();

    return () => {
      active = false;
    };
  }, [workspaceId, router]);

  async function refreshMembers() {
    const response = await api<Member[]>(
      `/team-members/${workspaceId}`
    );

    setMembers(response.data ?? []);
  }

  const owner = members.some(
    (member) =>
      String(member.userId) === String(user?.id) &&
      member.role === "owner"
  );

  const workspaceName =
    workspaces.find(
      (workspace) =>
        String(workspace.id) === workspaceId
    )?.name ?? "Workspace";

  async function addMember(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!owner || !workspaceId || busy !== null) {
      return;
    }

    setBusy("add");
    setError("");
    setSuccess("");

    try {
      await secureWrite<Member>(
        "POST",
        `/team-members/${workspaceId}`,
        {
          email: newEmail.trim().toLowerCase(),
          role: newRole,
        }
      );

      await refreshMembers();

      setNewEmail("");
      setNewRole("member");
      setSuccess("Team member added successfully.");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  }

  async function changeRole(member: Member) {
    if (!owner || busy !== null) return;

    if (member.role === "owner") return;

    const targetRole: NewRole =
      member.role === "admin" ? "member" : "admin";

    setBusy(member.userId);
    setError("");
    setSuccess("");

    try {
      await secureWrite(
        "PATCH",
        `/team-members/${workspaceId}/${member.userId}`,
        { role: targetRole }
      );

      await refreshMembers();

      setSuccess(
        `${member.fullName} is now ${targetRole}.`
      );
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  }

  async function removeMember(member: Member) {
    if (
      !owner ||
      busy !== null ||
      member.role === "owner"
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${member.fullName} from ${workspaceName}?\n\n` +
        "Their account will not be deleted."
    );

    if (!confirmed) return;

    setBusy(member.userId);
    setError("");
    setSuccess("");

    try {
      await secureWrite(
        "DELETE",
        `/team-members/${workspaceId}/${member.userId}`
      );

      await refreshMembers();

      setSuccess(
        `${member.fullName} was removed from the workspace.`
      );
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>
          Loading Team Management...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <h1>Sign in required</h1>
          <p className={styles.muted}>
            {error || "Checking your session..."}
          </p>
          <Link
            href="/login"
            className={styles.primaryLink}
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              WORKFLOW PRO / COLLABORATION
            </p>
            <h1>Team Management</h1>
            <p className={styles.muted}>
              Manage your workspace members and
              their access permissions.
            </p>
          </div>

          <div className={styles.links}>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/projects">Projects & Tasks</Link>
          </div>
        </header>

        <section className={styles.workspacePanel}>
          <label className={styles.field}>
            <span>Select workspace</span>
            <select
              value={workspaceId}
              disabled={busy !== null}
              onChange={(event) => {
                const nextId = event.target.value;
                if (nextId === workspaceId) return;
                setMembers([]);
                setError("");
                setSuccess("");
                setMembersLoading(Boolean(nextId));
                setWorkspaceId(nextId);
              }}
            >
              {workspaces.length === 0 && (
                <option value="">No workspaces</option>
              )}

              {workspaces.map((workspace) => (
                <option
                  key={String(workspace.id)}
                  value={String(workspace.id)}
                >
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.workspaceDetail}>
            <span>YOUR ROLE</span>
            <strong>
              {owner
                ? "Owner"
                : members.find(
                    (member) =>
                      String(member.userId) ===
                      String(user.id)
                  )?.role ?? "Loading"}
            </strong>
          </div>
        </section>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className={styles.success} role="status">
            {success}
          </div>
        )}

        {workspaces.length === 0 ? (
          <section className={styles.panel}>
            <h2>No workspace yet</h2>
            <p className={styles.muted}>
              Create a workspace from your dashboard.
            </p>
            <Link
              className={styles.primaryLink}
              href="/dashboard"
            >
              Create workspace
            </Link>
          </section>
        ) : (
          <div className={styles.columns}>
            <section className={styles.panel}>
              <div className={styles.sectionTitle}>
                <div>
                  <p className={styles.eyebrow}>
                    MEMBERS
                  </p>
                  <h2>Workspace directory</h2>
                </div>
                <span className={styles.count}>
                  {members.length} members
                </span>
              </div>

              {membersLoading ? (
                <p className={styles.muted}>
                  Loading members...
                </p>
              ) : (
                <div className={styles.memberList}>
                  {members.map((member) => (
                    <article
                      className={styles.member}
                      key={member.userId}
                    >
                      <div className={styles.avatar}>
                        {initials(member.fullName)}
                      </div>

                      <div className={styles.memberInfo}>
                        <strong>{member.fullName}</strong>
                        <span>{member.email}</span>
                        <span
                          className={
                            member.role === "owner"
                              ? styles.ownerBadge
                              : styles.roleBadge
                          }
                        >
                          {member.role.toUpperCase()}
                        </span>
                      </div>

                      {owner &&
                        member.role !== "owner" && (
                          <div className={styles.actions}>
                            <button
                              type="button"
                              onClick={() =>
                                void changeRole(member)
                              }
                              disabled={busy !== null}
                            >
                              {member.role === "admin"
                                ? "Make Member"
                                : "Make Admin"}
                            </button>

                            <button
                              type="button"
                              className={styles.dangerButton}
                              onClick={() =>
                                void removeMember(member)
                              }
                              disabled={busy !== null}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className={styles.panel}>
              <p className={styles.eyebrow}>
                WORKSPACE ACCESS
              </p>

              <h2>Add a team member</h2>

              {owner ? (
                <>
                  <p className={styles.muted}>
                    Add someone who has already
                    registered for WorkFlow Pro.
                  </p>

                  <form
                    className={styles.form}
                    onSubmit={(event) =>
                      void addMember(event)
                    }
                  >
                    <label className={styles.field}>
                      <span>Registered email address</span>
                      <input
                        type="email"
                        autoComplete="off"
                        placeholder="teammate@example.com"
                        value={newEmail}
                        onChange={(event) =>
                          setNewEmail(event.target.value)
                        }
                        required
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Membership role</span>
                      <select
                        value={newRole}
                        onChange={(event) =>
                          setNewRole(
                            event.target.value as NewRole
                          )
                        }
                      >
                        <option value="member">
                          Member
                        </option>
                        <option value="admin">
                          Admin
                        </option>
                      </select>
                    </label>

                    <button
                      className={styles.primaryButton}
                      disabled={
                        busy !== null ||
                        membersLoading
                      }
                      type="submit"
                    >
                      {busy === "add"
                        ? "Adding member..."
                        : "+ Add member"}
                    </button>
                  </form>
                </>
              ) : (
                <p className={styles.muted}>
                  Only the workspace owner can add,
                  remove or change team members.
                </p>
              )}

              <div className={styles.permissions}>
                <h3>Role permissions</h3>
                <p>
                  <strong>Owner:</strong> Full
                  membership management.
                </p>
                <p>
                  <strong>Admin:</strong> Create projects
                  and manage tasks.
                </p>
                <p>
                  <strong>Member:</strong> View projects
                  and work on tasks.
                </p>
                <p className={styles.muted}>
                  The workspace owner cannot be
                  removed or demoted here.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
