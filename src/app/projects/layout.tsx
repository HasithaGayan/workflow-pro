
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Projects & Tasks | WorkFlow Pro",
  description:
    "Manage projects, tasks and team progress in WorkFlow Pro.",
};

export default function ProjectsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}

      <nav
        aria-label="Project management navigation"
        style={{
          position: "fixed",
          right: "18px",
          bottom: "18px",
          zIndex: 30,
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <Link
          href="/projects"
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #485777",
            background: "#17233d",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 10px 28px #0007",
          }}
        >
          Projects & Tasks
        </Link>

        <Link
          href="/projects/insights"
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #948bff",
            background:
              "linear-gradient(120deg, #6366f1, #7546db)",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 10px 28px #0007",
          }}
        >
          Task Insights
        </Link>
      </nav>
    </>
  );
}
