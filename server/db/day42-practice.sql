
-- DAY 42: PostgreSQL CRUD and JOIN practice
-- Database: workflow_pro_dev
-- Run using the workflow_app account.

BEGIN;

-- CREATE: A project inside our existing workspace
INSERT INTO projects (workspace_id, name)
SELECT workspace_id, 'Library Management App'
FROM workspaces
WHERE name = 'Campus Software Team'
ON CONFLICT (workspace_id, name) DO NOTHING;

-- CREATE: Assign a task to an existing team member
INSERT INTO tasks (
    project_id,
    assigned_user_id,
    title,
    status,
    priority,
    due_date
)
SELECT
    p.project_id,
    u.user_id,
    'Design Database',
    'todo',
    'high',
    DATE '2026-12-01'
FROM projects p
JOIN workspaces w
    ON p.workspace_id = w.workspace_id
JOIN workspace_memberships m
    ON m.workspace_id = w.workspace_id
JOIN app_users u
    ON u.user_id = m.user_id
WHERE w.name = 'Campus Software Team'
  AND p.name = 'Library Management App'
  AND u.email = 'nimali.demo@example.com'
  AND NOT EXISTS (
      SELECT 1
      FROM tasks t
      WHERE t.project_id = p.project_id
        AND t.title = 'Design Database'
  );

-- UPDATE: Change our task's progress
UPDATE tasks t
SET status = 'in_progress'
FROM projects p
JOIN workspaces w
    ON w.workspace_id = p.workspace_id
WHERE t.project_id = p.project_id
  AND w.name = 'Campus Software Team'
  AND p.name = 'Library Management App'
  AND t.title = 'Design Database';

COMMIT;

-- READ: Show tasks with their project and assignee
SELECT
    t.task_id,
    t.title,
    p.name AS project,
    u.full_name AS assigned_to,
    t.status,
    t.priority,
    t.due_date
FROM tasks t
JOIN projects p
    ON t.project_id = p.project_id
LEFT JOIN app_users u
    ON t.assigned_user_id = u.user_id
ORDER BY t.task_id;

-- READ: Show workspace team members
SELECT
    w.name AS workspace,
    u.full_name AS member,
    m.role
FROM workspace_memberships m
JOIN workspaces w
    ON m.workspace_id = w.workspace_id
JOIN app_users u
    ON m.user_id = u.user_id
ORDER BY w.name, m.role;

-- DELETE PRACTICE:
-- Create a temporary practice task, delete it,
-- then roll back the practice transaction.
BEGIN;

INSERT INTO tasks (project_id, title)
SELECT p.project_id, 'TEMP SQL DELETE PRACTICE'
FROM projects p
JOIN workspaces w
    ON p.workspace_id = w.workspace_id
WHERE p.name = 'Library Management App'
  AND w.name = 'Campus Software Team'
RETURNING task_id, title;

DELETE FROM tasks
WHERE title = 'TEMP SQL DELETE PRACTICE'
RETURNING task_id, title;

ROLLBACK;

-- FINAL VERIFICATION
SELECT
    (SELECT COUNT(*) FROM app_users) AS users,
    (SELECT COUNT(*) FROM workspaces) AS workspaces,
    (SELECT COUNT(*) FROM workspace_memberships) AS memberships,
    (SELECT COUNT(*) FROM projects) AS projects,
    (SELECT COUNT(*) FROM tasks) AS tasks;
