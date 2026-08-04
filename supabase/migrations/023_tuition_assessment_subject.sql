-- Tuition assessments: link to subject for marks/performance records (admin-only, no student portal)

alter table public.tuition_assessments
  add column if not exists subject_id uuid references public.tuition_subjects (id) on delete set null;

create index if not exists tuition_assessments_subject_idx
  on public.tuition_assessments (organization_id, subject_id);
