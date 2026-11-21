
import type { Metadata } from "next";
import type { ReactNode } from "react";

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
  return children;
}
