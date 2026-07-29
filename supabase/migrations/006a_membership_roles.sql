-- STEP 1 ONLY — run this alone first, then run 006b
-- New membership roles (must commit before use in policies)

alter type public.membership_role add value if not exists 'supervisor';
alter type public.membership_role add value if not exists 'manager';
