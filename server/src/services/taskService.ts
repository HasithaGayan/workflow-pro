export type Task = {
  id: number;
  title: string;
  status: "todo" | "in_progress" | "done";
};

const tasks: Task[] = [
  { id: 1, title: "Plan WorkFlow Pro", status: "done" },
  { id: 2, title: "Build backend API", status: "in_progress" },
  { id: 3, title: "Design database", status: "todo" },
];

export function getAllTasks(): Task[] {
  return tasks;
}

export function findTaskById(id: number): Task | undefined {
  return tasks.find((task) => task.id === id);
}