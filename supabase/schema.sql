-- AeroPath OS: Multi-Tenant Production Schema

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Agencies (Tenants)
create table if not exists agencies (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  subdomain       text not null unique,
  logo_url        text,
  primary_color   text default '#6366f1',
  website         text,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Users (Staff)
create table if not exists users (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  auth_id         uuid not null unique,
  email           text not null unique,
  full_name       text,
  role            text check (role in ('Owner', 'Admin', 'Counselor', 'SuperAdmin')) default 'Counselor',
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Student Profiles
create table if not exists student_profiles (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  full_name       text not null,
  email           text,
  phone           text,
  nationality     text,
  degree_level    text,
  gpa             numeric,
  ielts_score     numeric,
  whatsapp_number  text,
  preferred_country text,
  preferred_intake text,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Partner Universities
create table if not exists partner_universities (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  name            text not null,
  country         text,
  logo_url        text,
  requirements    jsonb default '{}'::jsonb,
  scholarship_info text,
  commission_rate numeric default 10,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Application Pipeline
create table if not exists application_pipeline (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  student_id      uuid references student_profiles(id) on delete cascade,
  university_id   uuid references partner_universities(id) on delete set null,
  stage           text check (stage in ('Lead', 'Docs', 'Applied', 'Visa', 'Enrolled')) default 'Lead',
  intake          text,
  scholarship_amount numeric default 0,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Document Vault
create table if not exists document_vault (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  student_id      uuid references student_profiles(id) on delete cascade,
  file_name       text not null,
  file_url        text not null,
  type            text,
  ai_parsed_data  jsonb default '{}'::jsonb,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Financial Ledger
create table if not exists financial_ledger (
  id                  uuid primary key default uuid_generate_v4(),
  agency_id           uuid references agencies(id) on delete cascade,
  pipeline_id         uuid references application_pipeline(id) on delete cascade,
  expected_commission numeric default 0,
  status              text check (status in ('Pending', 'Received', 'Cancelled')) default 'Pending',
  created_at          timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Task Dispatcher
create table if not exists task_dispatcher (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  title           text not null,
  description     text,
  due_date        timestamp with time zone,
  status          text check (status in ('Pending', 'Completed')) default 'Pending',
  assigned_to_id  uuid references users(id) on delete set null,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
alter table agencies enable row level security;
alter table users enable row level security;
alter table student_profiles enable row level security;
alter table partner_universities enable row level security;
alter table application_pipeline enable row level security;
alter table document_vault enable row level security;
alter table financial_ledger enable row level security;
alter table task_dispatcher enable row level security;

-- Helper Function: Get User's Agency ID
create or replace function get_user_agency_id()
returns uuid language sql security definer stable as $$
  select agency_id from users where auth_id = auth.uid() limit 1;
$$;

-- Helper Function: Check if SuperAdmin
create or replace function is_superadmin()
returns boolean language sql security definer stable as $$
  select role = 'SuperAdmin' from users where auth_id = auth.uid() limit 1;
$$;

-- Policies for Agencies
create policy "SuperAdmins manage agencies" on agencies for all using (is_superadmin());
create policy "Agency members read their own agency" on agencies for select using (id = get_user_agency_id());

-- Policies for Users
create policy "SuperAdmins manage users" on users for all using (is_superadmin());
create policy "Agency members read their peers" on users for select using (agency_id = get_user_agency_id());

-- Policies for Students
create policy "Agency members read students" on student_profiles for select using (agency_id = get_user_agency_id());
create policy "Agency members manage students" on student_profiles for all using (agency_id = get_user_agency_id());

-- Policies for Universities
create policy "Universities visible to everyone or specific agency" on partner_universities for select using (agency_id is null or agency_id = get_user_agency_id());
create policy "Agency members manage their universities" on partner_universities for all using (agency_id = get_user_agency_id());

-- Policies for Pipeline
create policy "Agency members manage pipeline" on application_pipeline for all using (agency_id = get_user_agency_id());

-- Policies for Documents
create policy "Agency members manage documents" on document_vault for all using (agency_id = get_user_agency_id());

-- Policies for Financials
create policy "Agency members manage financials" on financial_ledger for all using (agency_id = get_user_agency_id());

-- Policies for Tasks
create policy "Agency members manage tasks" on task_dispatcher for all using (agency_id = get_user_agency_id());