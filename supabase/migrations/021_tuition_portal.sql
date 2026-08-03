-- Tuition portal: timetable fields, enrollments, assessments, student accounts (additive)

alter table public.tuition_classes add column if not exists teacher_name text;
alter table public.tuition_classes add column if not exists weekday smallint;
alter table public.tuition_classes add column if not exists start_time time;
alter table public.tuition_classes add column if not exists end_time time;
alter table public.tuition_classes add column if not exists room text;

comment on column public.tuition_classes.weekday is '0=Sunday … 6=Saturday';

create table if not exists public.tuition_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  class_id uuid not null references public.tuition_classes (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (class_id, customer_id)
);
create index if not exists tuition_enrollments_org_idx on public.tuition_enrollments (organization_id);
create index if not exists tuition_enrollments_customer_idx on public.tuition_enrollments (customer_id);

create table if not exists public.tuition_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  class_id uuid references public.tuition_classes (id) on delete set null,
  title text not null,
  instructions text,
  due_at timestamptz,
  max_score numeric(8,2) not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists tuition_assessments_org_idx on public.tuition_assessments (organization_id);

create table if not exists public.tuition_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  assessment_id uuid not null references public.tuition_assessments (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  answer_text text,
  status text not null default 'assigned',
  submitted_at timestamptz,
  score numeric(8,2),
  feedback text,
  created_at timestamptz not null default now(),
  unique (assessment_id, customer_id)
);
create index if not exists tuition_submissions_org_idx on public.tuition_submissions (organization_id);
create index if not exists tuition_submissions_customer_idx on public.tuition_submissions (customer_id);

-- Student login link (Auth user ↔ CRM customer). Not a staff membership.
create table if not exists public.tuition_students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, customer_id),
  unique (user_id)
);
create index if not exists tuition_students_org_idx on public.tuition_students (organization_id);
create index if not exists tuition_students_email_idx on public.tuition_students (lower(email));

alter table public.tuition_enrollments enable row level security;
alter table public.tuition_assessments enable row level security;
alter table public.tuition_submissions enable row level security;
alter table public.tuition_students enable row level security;

drop policy if exists "tuition_enrollments_all" on public.tuition_enrollments;
create policy "tuition_enrollments_all" on public.tuition_enrollments
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists "tuition_assessments_all" on public.tuition_assessments;
create policy "tuition_assessments_all" on public.tuition_assessments
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists "tuition_submissions_all" on public.tuition_submissions;
create policy "tuition_submissions_all" on public.tuition_submissions
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists "tuition_students_all" on public.tuition_students;
create policy "tuition_students_all" on public.tuition_students
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- Students can read their own portal row
drop policy if exists "tuition_students_self_select" on public.tuition_students;
create policy "tuition_students_self_select" on public.tuition_students
  for select using (user_id = auth.uid());
