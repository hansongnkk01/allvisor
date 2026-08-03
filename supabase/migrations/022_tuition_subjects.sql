-- Tuition subjects catalogue: price, teacher assignment, teacher pay

create table if not exists public.tuition_subjects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  teacher_name text,
  teacher_salary numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists tuition_subjects_org_idx on public.tuition_subjects (organization_id);

create table if not exists public.tuition_subject_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subject_id uuid not null references public.tuition_subjects (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (subject_id, customer_id)
);
create index if not exists tuition_subject_enrollments_org_idx on public.tuition_subject_enrollments (organization_id);
create index if not exists tuition_subject_enrollments_customer_idx on public.tuition_subject_enrollments (customer_id);

alter table public.tuition_classes
  add column if not exists subject_id uuid references public.tuition_subjects (id) on delete set null;

alter table public.tuition_subjects enable row level security;
alter table public.tuition_subject_enrollments enable row level security;

drop policy if exists "tuition_subjects_all" on public.tuition_subjects;
create policy "tuition_subjects_all" on public.tuition_subjects
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists "tuition_subject_enrollments_all" on public.tuition_subject_enrollments;
create policy "tuition_subject_enrollments_all" on public.tuition_subject_enrollments
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
