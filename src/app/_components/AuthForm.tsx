
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "../workflow.module.css";

type AuthMode = "login" | "register";

type ApiResponse = {
  success?: boolean;
  error?: string;
};

export default function AuthForm({
  mode,
}: {
  mode: AuthMode;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const registering = mode === "register";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const endpoint = registering
        ? "/api/workflow/auth/register"
        : "/api/workflow/auth/login";

      const body = registering
        ? {
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }
        : {
            email: email.trim().toLowerCase(),
            password,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : `Request failed (${response.status})`
        );
      }

      // Clear password from component state.
      setPassword("");

      if (registering) {
        router.replace("/login");
      } else {
        router.replace("/dashboard");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.authContainer}>
        <div className={styles.panel}>
          <div className={styles.brand}>
            <span className={styles.logo}>W</span>
            WorkFlow Pro
          </div>

          <p className={styles.eyebrow}>
            {registering ? "GET STARTED" : "WELCOME BACK"}
          </p>

          <h1 className={styles.title}>
            {registering
              ? "Create your account"
              : "Sign in to your workspace"}
          </h1>

          <p className={styles.subtitle}>
            {registering
              ? "Organize projects, coordinate tasks, and collaborate with your team."
              : "Enter your account details to continue managing your team's work."}
          </p>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            {registering && (
              <div className={styles.field}>
                <label
                  className={styles.label}
                  htmlFor="fullName"
                >
                  Full name
                </label>

                <input
                  id="fullName"
                  className={styles.input}
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  minLength={2}
                  maxLength={120}
                  required
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                />
              </div>
            )}

            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor="email"
              >
                Email address
              </label>

              <input
                id="email"
                className={styles.input}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={255}
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            </div>

            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor="password"
              >
                Password
              </label>

              <input
                id="password"
                className={styles.input}
                type="password"
                autoComplete={
                  registering
                    ? "new-password"
                    : "current-password"
                }
                placeholder={
                  registering
                    ? "At least 12 characters"
                    : "Enter your password"
                }
                minLength={registering ? 12 : 1}
                maxLength={128}
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />
            </div>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <button
              className={styles.button}
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : registering
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className={styles.footer}>
            {registering ? (
              <>
                Already have an account?{" "}
                <Link
                  className={styles.link}
                  href="/login"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to WorkFlow Pro?{" "}
                <Link
                  className={styles.link}
                  href="/register"
                >
                  Create an account
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
