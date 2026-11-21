
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard | WorkFlow Pro",
  description:
    "Manage your WorkFlow Pro workspaces, projects and tasks.",
};

export default function DashboardLayout({
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
          right: "22px",
          bottom: "22px",
          zIndex: 30,
        }}
      >
        <Link
          href="/projects"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "15px 19px",
            borderRadius: "14px",
            background:
              "linear-gradient(120deg, #6868f7, #7546db)",
            border: "1px solid #948bff",
            boxShadow: "0 12px 35px #0007",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 750,
            fontSize: "13px",
          }}
        >
          <span aria-hidden="true">▦</span>
          Projects & Tasks
        </Link>
      </nav>
    </>
  );
}
