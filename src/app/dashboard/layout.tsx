
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard | WorkFlow Pro",
  description: "Manage your workspaces, projects, and tasks.",
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
