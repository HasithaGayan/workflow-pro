
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Projects & Tasks | WorkFlow Pro",
  description:
    "Manage projects, tasks, team progress and workflows.",
};

const navigation = [
  {
    href: "/projects",
    label: "Projects & Tasks",
  },
  {
    href: "/projects/insights",
    label: "Task Insights",
  },
  {
    href: "/projects/board",
    label: "Task Board",
  },
];

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
          right: "16px",
          bottom: "16px",
          zIndex: 30,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: "8px",
          maxWidth: "calc(100% - 32px)",
        }}
      >
        {navigation.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "11px 14px",
              borderRadius: "11px",
              border: "1px solid #6673a3",
              background:
                index === 2
                  ? "linear-gradient(120deg, #6366f1, #7b46d9)"
                  : "#17233d",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 750,
              textDecoration: "none",
              boxShadow: "0 10px 28px #0007",
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
