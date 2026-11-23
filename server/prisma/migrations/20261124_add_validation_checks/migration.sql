-- Preserve existing WorkFlow Pro validation rules.

ALTER TABLE public.app_users ADD CONSTRAINT app_users_full_name_check CHECK ((length(TRIM(BOTH FROM full_name)) > 0));

ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])));

ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (((status)::text = ANY ((ARRAY['todo'::character varying, 'in_progress'::character varying, 'done'::character varying])::text[])));

ALTER TABLE public.workspace_memberships ADD CONSTRAINT workspace_memberships_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying])::text[])));

ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_name_check CHECK ((length(TRIM(BOTH FROM name)) > 0));
