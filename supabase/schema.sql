create extension if not exists pgcrypto;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  code_name text not null unique,
  display_name text not null,
  room text not null,
  role text not null,
  status text not null default 'IDLE',
  trust_score numeric not null default 1.0,
  runtime_quota_pct integer not null default 100,
  compute_core_temp numeric not null default 35.0,
  efficiency_modifier numeric not null default 1.0,
  instability_risk numeric not null default 0.0,
  total_tasks_completed integer not null default 0,
  total_tasks_failed integer not null default 0,
  total_penalties integer not null default 0,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agents_quota_range check (runtime_quota_pct between 0 and 100),
  constraint agents_trust_range check (trust_score between 0 and 1)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  room text not null,
  assigned_agent_id uuid references public.agents(id) on delete set null,
  status text not null default 'QUEUED',
  priority integer not null default 3,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  quality_score numeric,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint tasks_priority_range check (priority between 1 and 4),
  constraint tasks_quality_range check (quality_score is null or quality_score between 0 and 1)
);

create table if not exists public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  room text,
  level text not null default 'INFO',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_metrics (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  runtime_quota_pct integer not null,
  compute_core_temp numeric not null,
  efficiency_modifier numeric not null,
  trust_score numeric not null,
  instability_risk numeric not null,
  recorded_at timestamptz not null default now()
);

create table if not exists public.penalties (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  penalty_type text not null,
  reason text,
  quota_delta integer not null default 0,
  trust_delta numeric not null default 0,
  cooldown_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  provider text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_agent_idx on public.tasks(assigned_agent_id);
create index if not exists agent_logs_created_idx on public.agent_logs(created_at desc);
create index if not exists agent_logs_agent_idx on public.agent_logs(agent_id);
create index if not exists agent_metrics_agent_idx on public.agent_metrics(agent_id, recorded_at desc);
create index if not exists penalties_agent_idx on public.penalties(agent_id);
create index if not exists ledger_agent_idx on public.ledger_entries(agent_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at before update on public.agents
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.agents enable row level security;
alter table public.tasks enable row level security;
alter table public.agent_logs enable row level security;
alter table public.agent_metrics enable row level security;
alter table public.penalties enable row level security;
alter table public.ledger_entries enable row level security;

-- Development-only policies. Replace these with user/team ownership rules before production.
do $$
declare
  target_table text;
begin
  foreach target_table in array array['agents', 'tasks', 'agent_logs', 'agent_metrics', 'penalties', 'ledger_entries']
  loop
    execute format('drop policy if exists %I on public.%I', target_table || '_dev_select', target_table);
    execute format('drop policy if exists %I on public.%I', target_table || '_dev_insert', target_table);
    execute format('drop policy if exists %I on public.%I', target_table || '_dev_update', target_table);
    execute format('drop policy if exists %I on public.%I', target_table || '_dev_delete', target_table);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', target_table || '_dev_select', target_table);
    execute format('create policy %I on public.%I for insert to anon, authenticated with check (true)', target_table || '_dev_insert', target_table);
    execute format('create policy %I on public.%I for update to anon, authenticated using (true) with check (true)', target_table || '_dev_update', target_table);
    execute format('create policy %I on public.%I for delete to anon, authenticated using (true)', target_table || '_dev_delete', target_table);
  end loop;
end;
$$;

insert into public.agents (code_name, display_name, room, role)
values
  ('ORACLE', 'Oracle Node', 'STRATEGY_ROOM', 'Strategy and signal analysis'),
  ('FORGE', 'Forge Node', 'PRODUCTION_ROOM', 'Asset and production assembly'),
  ('LEDGER', 'Ledger Node', 'COMMERCE_ROOM', 'Commerce and budget control'),
  ('JUDGE', 'Judge Node', 'REVIEW_ROOM', 'Quality and compliance review')
on conflict (code_name) do update
set display_name = excluded.display_name,
    room = excluded.room,
    role = excluded.role;

do $$
declare
  target_table text;
begin
  foreach target_table in array array['agents', 'tasks', 'agent_logs']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end;
$$;
