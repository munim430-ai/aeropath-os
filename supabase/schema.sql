-- ============================================================
-- AeroPath OS — Database Schema with Row Level Security
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. AGENCY (Tenant)
-- ────────────────────────────────────────────────────────────
create table if not exists agencies (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  subdomain     text not null unique,
  logo_url      text,
  primary_color text not null default '#6366f1',
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. USER
-- ────────────────────────────────────────────────────────────
create table if not exists users (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  auth_id     uuid not null unique references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'Consultant'
                check (role in ('SuperAdmin', 'Owner', 'Consultant', 'Student')),
  created_at  timestamptz not null default now()
);

create index if not exists users_agency_id_idx on users(agency_id);
create index if not exists users_auth_id_idx   on users(auth_id);

-- ────────────────────────────────────────────────────────────
-- 3. STUDENT PROFILE
-- ────────────────────────────────────────────────────────────
create table if not exists student_profiles (
  id           uuid primary key default uuid_generate_v4(),
  agency_id    uuid not null references agencies(id) on delete cascade,
  user_id      uuid references users(id) on delete set null,
  full_name    text not null,
  email        text,
  phone        text,
  nationality  text,
  degree_level text,
  gpa          numeric(4,2),
  ielts_score  numeric(3,1),
  created_at   timestamptz not null default now()
);

create index if not exists student_profiles_agency_id_idx on student_profiles(agency_id);

-- ────────────────────────────────────────────────────────────
-- 4. DOCUMENT VAULT
-- ────────────────────────────────────────────────────────────
create table if not exists document_vault (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid not null references agencies(id) on delete cascade,
  student_id      uuid not null references student_profiles(id) on delete cascade,
  type            text not null default 'Other'
                    check (type in ('Passport', 'Transcript', 'IELTS', 'CV', 'Other')),
  file_url        text not null,
  file_name       text not null,
  ai_parsed_data  jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists document_vault_agency_id_idx  on document_vault(agency_id);
create index if not exists document_vault_student_id_idx on document_vault(student_id);

-- ────────────────────────────────────────────────────────────
-- 5. PARTNER UNIVERSITY
-- ────────────────────────────────────────────────────────────
create table if not exists partner_universities (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  name            text not null,
  country         text,
  requirements    jsonb not null default '{}',
  commission_rate numeric(5,2) not null default 10.00,
  created_at      timestamptz not null default now()
);

create index if not exists partner_universities_agency_id_idx on partner_universities(agency_id);

-- ────────────────────────────────────────────────────────────
-- 6. APPLICATION PIPELINE
-- ────────────────────────────────────────────────────────────
create table if not exists application_pipeline (
  id             uuid primary key default uuid_generate_v4(),
  agency_id      uuid not null references agencies(id) on delete cascade,
  student_id     uuid not null references student_profiles(id) on delete cascade,
  university_id  uuid not null references partner_universities(id) on delete cascade,
  stage          text not null default 'Lead'
                   check (stage in ('Lead', 'Docs', 'Applied', 'Visa', 'Enrolled')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists application_pipeline_agency_id_idx on application_pipeline(agency_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger application_pipeline_updated_at
  before update on application_pipeline
  for each row execute function update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 7. TASK DISPATCHER
-- ────────────────────────────────────────────────────────────
create table if not exists task_dispatcher (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid not null references agencies(id) on delete cascade,
  assigned_to_id  uuid references users(id) on delete set null,
  title           text not null,
  description     text,
  status          text not null default 'Pending'
                    check (status in ('Pending', 'Completed')),
  due_date        date,
  created_at      timestamptz not null default now()
);

create index if not exists task_dispatcher_agency_id_idx on task_dispatcher(agency_id);

-- ────────────────────────────────────────────────────────────
-- 8. FINANCIAL LEDGER
-- ────────────────────────────────────────────────────────────
create table if not exists financial_ledger (
  id                  uuid primary key default uuid_generate_v4(),
  agency_id           uuid not null references agencies(id) on delete cascade,
  pipeline_id         uuid not null references application_pipeline(id) on delete cascade,
  expected_commission numeric(10,2) not null default 0,
  status              text not null default 'Pending'
                        check (status in ('Pending', 'Received', 'Cancelled')),
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists financial_ledger_agency_id_idx on financial_ledger(agency_id);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function: get the current user's agency_id from the users table
create or replace function get_user_agency_id()
returns uuid language sql security definer stable as $$
  select agency_id from users where auth_id = auth.uid() limit 1;
$$;

-- Helper function: get the current user's role
create or replace function get_user_role()
returns text language sql security definer stable as $$
  select role from users where auth_id = auth.uid() limit 1;
$$;

-- ── agencies ──────────────────────────────────────────────────
alter table agencies enable row level security;

create policy "Users read own agency" on agencies
  for select using (id = get_user_agency_id());

create policy "Owners update own agency" on agencies
  for update using (
    id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner')
  ) with check (id = get_user_agency_id());

-- ── users ─────────────────────────────────────────────────────
alter table users enable row level security;

create policy "Users read own agency members" on users
  for select using (agency_id = get_user_agency_id());

create policy "Owners manage users - Select" on users
  for select using (agency_id = get_user_agency_id() and get_user_role() in ('SuperAdmin', 'Owner'));

create policy "Owners manage users - Insert" on users
  for insert with check (agency_id = get_user_agency_id() and get_user_role() in ('SuperAdmin', 'Owner'));

create policy "Owners manage users - Update" on users
  for update using (agency_id = get_user_agency_id() and get_user_role() in ('SuperAdmin', 'Owner'))
  with check (agency_id = get_user_agency_id());

create policy "Owners manage users - Delete" on users
  for delete using (agency_id = get_user_agency_id() and get_user_role() in ('SuperAdmin', 'Owner'));

-- ── student_profiles ──────────────────────────────────────────
alter table student_profiles enable row level security;

create policy "Agency members read students" on student_profiles
  for select using (agency_id = get_user_agency_id());

create policy "Consultants insert students" on student_profiles
  for insert with check (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  );

create policy "Consultants update students" on student_profiles
  for update using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  ) with check (agency_id = get_user_agency_id());

create policy "Consultants delete students" on student_profiles
  for delete using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  );

-- ── document_vault ────────────────────────────────────────────
alter table document_vault enable row level security;

create policy "Agency members read documents" on document_vault
  for select using (agency_id = get_user_agency_id());

create policy "Consultants insert documents" on document_vault
  for insert with check (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  );

create policy "Consultants update documents" on document_vault
  for update using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  ) with check (agency_id = get_user_agency_id());

create policy "Consultants delete documents" on document_vault
  for delete using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  );

-- ── partner_universities ──────────────────────────────────────
alter table partner_universities enable row level security;

create policy "Agency members read universities" on partner_universities
  for select using (
    agency_id = get_user_agency_id()
    or agency_id is null
  );

create policy "Owners insert universities" on partner_universities
  for insert with check (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner')
  );

create policy "Owners update universities" on partner_universities
  for update using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner')
  ) with check (agency_id = get_user_agency_id());

create policy "Owners delete universities" on partner_universities
  for delete using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner')
  );

-- ── application_pipeline ──────────────────────────────────────
alter table application_pipeline enable row level security;

create policy "Agency members read pipeline" on application_pipeline
  for select using (agency_id = get_user_agency_id());

create policy "Consultants insert pipeline" on application_pipeline
  for insert with check (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  );

create policy "Consultants update pipeline" on application_pipeline
  for update using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  ) with check (agency_id = get_user_agency_id());

create policy "Consultants delete pipeline" on application_pipeline
  for delete using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  );

-- ── task_dispatcher ───────────────────────────────────────────
alter table task_dispatcher enable row level security;

create policy "Agency members read tasks" on task_dispatcher
  for select using (agency_id = get_user_agency_id());

create policy "Consultants insert tasks" on task_dispatcher
  for insert with check (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  );

create policy "Consultants update tasks" on task_dispatcher
  for update using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  ) with check (agency_id = get_user_agency_id());

create policy "Consultants delete tasks" on task_dispatcher
  for delete using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner', 'Consultant')
  );

-- ── financial_ledger ──────────────────────────────────────────
alter table financial_ledger enable row level security;

create policy "Agency members read ledger" on financial_ledger
  for select using (agency_id = get_user_agency_id());

create policy "Owners insert ledger" on financial_ledger
  for insert with check (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner')
  );

create policy "Owners update ledger" on financial_ledger
  for update using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner')
  ) with check (agency_id = get_user_agency_id());

create policy "Owners delete ledger" on financial_ledger
  for delete using (
    agency_id = get_user_agency_id()
    and get_user_role() in ('SuperAdmin', 'Owner')
  );

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Storage RLS
create policy "Agency members upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid() is not null
    -- Ensure the path starts with the agency_id
    and (storage.foldername(name))[1] = get_user_agency_id()::text
  );

create policy "Agency members read own documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid() is not null
    -- Ensure the path starts with the agency_id
    and (storage.foldername(name))[1] = get_user_agency_id()::text
  );

create policy "Anyone read logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "Owners upload logos"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and auth.uid() is not null
    and get_user_role() in ('SuperAdmin', 'Owner')
    and (storage.foldername(name))[1] = get_user_agency_id()::text
  );
