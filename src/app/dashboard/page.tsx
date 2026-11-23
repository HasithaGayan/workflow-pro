
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import styles from "../workflow.module.css";

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

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  csrfToken?: string;
};

async function readResponse<T>(
  response: Response
): Promise<ApiResponse<T>> {
  const body = await response.json();

  return body as ApiResponse<T>;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        // Verify the current login session.
        const profileResponse = await fetch(
          "/api/workflow/auth/me",
          {
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        if (profileResponse.status === 401) {
          router.replace("/login");
          return;
        }

        if (!profileResponse.ok) {
          throw new Error("Unable to load your profile");
        }

        const profile = await readResponse<User>(
          profileResponse
        );

        if (!profile.data) {
          throw new Error("Profile data is missing");
        }

        // Fetch only workspaces the user belongs to.
        const workspaceResponse = await fetch(
          "/api/workflow/workspaces",
          {
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        if (workspaceResponse.status === 401) {
          router.replace("/login");
          return;
        }

        if (!workspaceResponse.ok) {
          throw new Error("Unable to load your workspaces");
        }

        const workspaceResult =
          await readResponse<Workspace[]>(
            workspaceResponse
          );

        if (active) {
          setUser(profile.data);
          setWorkspaces(workspaceResult.data ?? []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load dashboard"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  // Obtain a token tied to the current session.
  async function getCsrfToken(): Promise<string> {
    const response = await fetch(
      "/api/workflow/auth/csrf",
      {
        credentials: "same-origin",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        router.replace("/login");
      }

      throw new Error("Unable to verify your session");
    }

    const body = await readResponse<never>(response);

    if (
      !body.csrfToken ||
      !/^[0-9a-f]{64}$/.test(body.csrfToken)
    ) {
      throw new Error("Invalid CSRF token received");
    }

    return body.csrfToken;
  }

  async function createWorkspace(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name = workspaceName.trim();

    if (name.length < 3 || busy) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(
        "/api/workflow/workspaces",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ name }),
        }
      );

      const result =
        await readResponse<Workspace>(response);

      if (!response.ok || !result.data) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Workspace creation failed"
        );
      }

      setWorkspaces((previous) => [
        ...previous,
        result.data!,
      ]);

      setWorkspaceName("");
      setSuccess("Workspace created successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(
        "/api/workflow/auth/logout",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log out"
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.subtitle}>
            Loading your workspace...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          {error ? (
            <p className={styles.error}>{error}</p>
          ) : (
            <p className={styles.subtitle}>
              Checking your session...
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.logo}>W</span>
            WorkFlow Pro
          </div>

          <button
            className={styles.secondaryButton}
            type="button"
            onClick={logout}
            disabled={busy}
          >
            Sign out
          </button>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            YOUR WORKSPACE DASHBOARD
          </p>

          <h1 className={styles.title}>
            Welcome, {user.fullName}!
          </h1>

          <p className={styles.subtitle}>
            Signed in as {user.email}. Manage your
            workspaces and stay organized.
          </p>
        </section>

        <section className={styles.grid}>
          <article className={styles.stat}>
            <p className={styles.statLabel}>
              My workspaces
            </p>
            <p className={styles.statValue}>
              {workspaces.length}
            </p>
          </article>

          <article className={styles.stat}>
            <p className={styles.statLabel}>
              Account
            </p>
            <p className={styles.statValue}>
              Active
            </p>
          </article>

          <article className={styles.stat}>
            <p className={styles.statLabel}>
              Session
            </p>
            <p className={styles.statValue}>
              Secure
            </p>
          </article>
        </section>

        <section className={styles.panel}>
          <p className={styles.eyebrow}>
            WORKSPACE MANAGEMENT
          </p>

          <h2 className={styles.sectionTitle}>
            Create a workspace
          </h2>

          <form
            className={styles.createRow}
            onSubmit={createWorkspace}
          >
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. University Project Team"
              value={workspaceName}
              minLength={3}
              maxLength={120}
              required
              aria-label="Workspace name"
              onChange={(event) =>
                setWorkspaceName(event.target.value)
              }
            />

            <button
              className={styles.button}
              disabled={busy}
              type="submit"
            >
              {busy ? "Please wait..." : "Create workspace"}
            </button>
          </form>

          {error && (
            <p
              className={styles.error}
              role="alert"
              style={{ marginTop: 18 }}
            >
              {error}
            </p>
          )}

          {success && (
            <p
              className={styles.success}
              role="status"
              style={{ marginTop: 18 }}
            >
              {success}
            </p>
          )}
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 className={styles.sectionTitle}>
            My workspaces
          </h2>

          {workspaces.length === 0 ? (
            <div className={styles.empty}>
              You don&apos;t have any workspaces yet.
              Create your first workspace above.
            </div>
          ) : (
            <div className={styles.workspaceList}>
              {workspaces.map((workspace) => (
                <article
                  className={styles.workspace}
                  key={workspace.id}
                >
                  <h3 className={styles.workspaceName}>
                    {workspace.name}
                  </h3>

                  <p className={styles.muted}>
                    Workspace ID: {workspace.id}
                  </p>
                  <p className={styles.muted}>
                    Created:{" "}
                    {new Date(
                      workspace.createdAt
                    ).toLocaleDateString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
