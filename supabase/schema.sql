-- AeroPath OS: Multi-Tenant Production Schema
-- Synced with live DB 2026-05-09

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
  created_at      timestamp with time zone default now() not null
);

-- 3. Users (Staff)
create table if not exists users (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  auth_id         uuid not null unique references auth.users(id),
  email           text not null unique,
  full_name       text,
  role            text check (role in ('SuperAdmin', 'Owner', 'Consultant', 'Student')) default 'Consultant',
  created_at      timestamp with time zone default now() not null
);

-- 4. Student Profiles
create table if not exists student_profiles (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  user_id         uuid references users(id) on delete set null,
  full_name       text not null,
  email           text,
  phone           text,
  nationality     text,
  degree_level    text,
  gpa             numeric,
  ielts_score     numeric,
  whatsapp_number text,
  preferred_country text,
  preferred_intake  text,
  created_at      timestamp with time zone default now() not null
);

-- 5. Partner Universities
create table if not exists partner_universities (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  name            text not null,
  country         text,
  requirements    jsonb default '{}'::jsonb,
  commission_rate numeric default 10,
  created_at      timestamp with time zone default now() not null
);

-- 6. Application Pipeline
create table if not exists application_pipeline (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  student_id      uuid references student_profiles(id) on delete cascade not null,
  university_id   uuid references partner_universities(id) on delete set null not null,
  stage           text check (stage in ('Lead', 'Docs', 'Applied', 'Visa', 'Enrolled')) default 'Lead',
  notes           text,
  created_at      timestamp with time zone default now() not null,
  updated_at      timestamp with time zone default now() not null
);

-- 7. Document Vault
create table if not exists document_vault (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  student_id      uuid references student_profiles(id) on delete cascade not null,
  file_name       text not null,
  file_url        text not null,
  type            text check (type in ('Passport', 'Transcript', 'IELTS', 'CV', 'Other')) default 'Other',
  ai_parsed_data  jsonb,
  created_at      timestamp with time zone default now() not null
);

-- 8. Financial Ledger
create table if not exists financial_ledger (
  id                  uuid primary key default uuid_generate_v4(),
  agency_id           uuid references agencies(id) on delete cascade not null,
  pipeline_id         uuid references application_pipeline(id) on delete cascade not null,
  expected_commission numeric default 0,
  status              text check (status in ('Pending', 'Received', 'Cancelled')) default 'Pending',
  notes               text,
  created_at          timestamp with time zone default now() not null
);

-- 9. Task Dispatcher
create table if not exists task_dispatcher (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  assigned_to_id  uuid references users(id) on delete set null,
  title           text not null,
  description     text,
  status          text check (status in ('Pending', 'Completed')) default 'Pending',
  due_date        date,
  created_at      timestamp with time zone default now() not null
);

-- 10. Cash Ledger (Daily Expenses/Inflow)
create table if not exists cash_ledger (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  date            date default current_date,
  description     text,
  category        text,
  amount          numeric not null,
  type            text check (type in ('In', 'Out')) not null,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Bank Transactions
create table if not exists bank_transactions (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  date            date default current_date,
  description     text,
  type            text check (type in ('Deposit', 'Withdrawal')) not null,
  amount          numeric not null,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Website Content CMS
create table if not exists website_content (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade unique not null,
  content         jsonb default '{}'::jsonb not null,
  is_published    boolean default false not null,
  published_at    timestamp with time zone,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Student Tracking Workbook Metadata
create table if not exists student_tracking_uploads (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade unique not null,
  file_name       text not null,
  storage_path    text not null,
  row_count       integer default 0 not null,
  uploaded_by_email text,
  status          text check (status in ('Uploaded', 'Cleared')) default 'Uploaded' not null,
  uploaded_at     timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migrations: add columns that may be missing from existing tables
alter table student_profiles add column if not exists whatsapp_number text;
alter table student_profiles add column if not exists preferred_country text;
alter table student_profiles add column if not exists preferred_intake text;
alter table student_profiles add column if not exists user_id uuid references users(id) on delete set null;

-- ROW LEVEL SECURITY (RLS) POLICIES

alter table agencies enable row level security;
alter table users enable row level security;
alter table student_profiles enable row level security;
alter table partner_universities enable row level security;
alter table application_pipeline enable row level security;
alter table document_vault enable row level security;
alter table financial_ledger enable row level security;
alter table task_dispatcher enable row level security;
alter table cash_ledger enable row level security;
alter table bank_transactions enable row level security;
alter table website_content enable row level security;
alter table student_tracking_uploads enable row level security;

-- Helper Functions
create or replace function get_user_agency_id()
returns uuid language sql security definer stable as $$
  select agency_id from users where auth_id = auth.uid() limit 1;
$$;

create or replace function is_superadmin()
returns boolean language sql security definer stable as $$
  select role = 'SuperAdmin' from users where auth_id = auth.uid() limit 1;
$$;

-- Policies for Agencies
drop policy if exists "SuperAdmins manage agencies" on agencies;
drop policy if exists "Agency members read their own agency" on agencies;
drop policy if exists "Public agency profiles for published websites" on agencies;
create policy "SuperAdmins manage agencies" on agencies for all using (is_superadmin());
create policy "Agency members read their own agency" on agencies for select using (id = get_user_agency_id());
create policy "Public agency profiles for published websites" on agencies
  for select using (
    exists (
      select 1 from website_content
      where website_content.agency_id = agencies.id
        and website_content.is_published = true
    )
  );

-- Policies for Users
drop policy if exists "SuperAdmins manage users" on users;
drop policy if exists "Agency members read their peers" on users;
create policy "SuperAdmins manage users" on users for all using (is_superadmin());
create policy "Agency members read their peers" on users for select using (agency_id = get_user_agency_id());

-- Policies for Students
drop policy if exists "Agency members read students" on student_profiles;
drop policy if exists "Agency members manage students" on student_profiles;
create policy "Agency members read students" on student_profiles for select using (agency_id = get_user_agency_id());
create policy "Agency members manage students" on student_profiles for all using (agency_id = get_user_agency_id());

-- Policies for Universities
drop policy if exists "Universities visible to everyone or specific agency" on partner_universities;
drop policy if exists "Agency members manage their universities" on partner_universities;
create policy "Universities visible to everyone or specific agency" on partner_universities for select using (agency_id is null or agency_id = get_user_agency_id());
create policy "Agency members manage their universities" on partner_universities for all using (agency_id = get_user_agency_id());

-- Policies for Pipeline
drop policy if exists "Agency members manage pipeline" on application_pipeline;
create policy "Agency members manage pipeline" on application_pipeline for all using (agency_id = get_user_agency_id());

-- Policies for Documents
drop policy if exists "Agency members manage documents" on document_vault;
drop policy if exists "Students read their own documents" on document_vault;
drop policy if exists "Students insert their own documents" on document_vault;
create policy "Agency members manage documents" on document_vault for all using (agency_id = get_user_agency_id());
create policy "Students read their own documents" on document_vault
  for select using (
    exists (
      select 1 from student_profiles
      where student_profiles.id = document_vault.student_id
        and student_profiles.agency_id = document_vault.agency_id
        and lower(student_profiles.email) = lower(auth.jwt() ->> 'email')
    )
  );
create policy "Students insert their own documents" on document_vault
  for insert with check (
    exists (
      select 1 from student_profiles
      where student_profiles.id = document_vault.student_id
        and student_profiles.agency_id = document_vault.agency_id
        and lower(student_profiles.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Policies for Financials
drop policy if exists "Agency members manage financials" on financial_ledger;
create policy "Agency members manage financials" on financial_ledger for all using (agency_id = get_user_agency_id());

-- Policies for Tasks
drop policy if exists "Agency members manage tasks" on task_dispatcher;
create policy "Agency members manage tasks" on task_dispatcher for all using (agency_id = get_user_agency_id());

-- Policies for Cash Ledger
drop policy if exists "Agency members manage cash ledger" on cash_ledger;
create policy "Agency members manage cash ledger" on cash_ledger for all using (agency_id = get_user_agency_id());

-- Policies for Bank Transactions
drop policy if exists "Agency members manage bank transactions" on bank_transactions;
create policy "Agency members manage bank transactions" on bank_transactions for all using (agency_id = get_user_agency_id());

-- Policies for Website Content
drop policy if exists "Agency members manage website content" on website_content;
drop policy if exists "Published website content is public" on website_content;
create policy "Agency members manage website content" on website_content
  for all using (agency_id = get_user_agency_id());
create policy "Published website content is public" on website_content
  for select using (is_published = true);

-- Policies for Student Tracking Upload Metadata
drop policy if exists "Agency members read student tracking uploads" on student_tracking_uploads;
drop policy if exists "Agency members manage student tracking uploads" on student_tracking_uploads;
create policy "Agency members read student tracking uploads" on student_tracking_uploads
  for select using (agency_id = get_user_agency_id());
create policy "Agency members manage student tracking uploads" on student_tracking_uploads
  for all using (agency_id = get_user_agency_id());

-- Storage Buckets
insert into storage.buckets (id, name, public)
values ('website-assets', 'website-assets', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('student-tracking-files', 'student-tracking-files', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

-- Storage Policies: Website Assets
drop policy if exists "Agency members upload website assets" on storage.objects;
drop policy if exists "Agency members update website assets" on storage.objects;
drop policy if exists "Agency members delete website assets" on storage.objects;
create policy "Agency members upload website assets" on storage.objects
  for insert with check (
    bucket_id = 'website-assets'
    and (storage.foldername(name))[1] in (
      select agencies.subdomain from agencies where agencies.id = get_user_agency_id()
    )
  );
create policy "Agency members update website assets" on storage.objects
  for update using (
    bucket_id = 'website-assets'
    and (storage.foldername(name))[1] in (
      select agencies.subdomain from agencies where agencies.id = get_user_agency_id()
    )
  );
create policy "Agency members delete website assets" on storage.objects
  for delete using (
    bucket_id = 'website-assets'
    and (storage.foldername(name))[1] in (
      select agencies.subdomain from agencies where agencies.id = get_user_agency_id()
    )
  );

-- Storage Policies: Agency Logos
drop policy if exists "Agency members upload agency logos" on storage.objects;
drop policy if exists "Agency members update agency logos" on storage.objects;
drop policy if exists "Agency members delete agency logos" on storage.objects;
create policy "Agency members upload agency logos" on storage.objects
  for insert with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[2] = get_user_agency_id()::text
  );
create policy "Agency members update agency logos" on storage.objects
  for update using (
    bucket_id = 'logos'
    and (storage.foldername(name))[2] = get_user_agency_id()::text
  );
create policy "Agency members delete agency logos" on storage.objects
  for delete using (
    bucket_id = 'logos'
    and (storage.foldername(name))[2] = get_user_agency_id()::text
  );

-- Storage Policies: Documents
drop policy if exists "Agency members upload document files" on storage.objects;
drop policy if exists "Students upload own document files" on storage.objects;
drop policy if exists "Students read own document files" on storage.objects;
create policy "Agency members upload document files" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select agencies.subdomain from agencies where agencies.id = get_user_agency_id()
    )
  );
create policy "Students upload own document files" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and exists (
      select 1 from student_profiles
      join agencies on agencies.id = student_profiles.agency_id
      where agencies.subdomain = (storage.foldername(name))[1]
        and student_profiles.id::text = (storage.foldername(name))[2]
        and lower(student_profiles.email) = lower(auth.jwt() ->> 'email')
    )
  );
create policy "Students read own document files" on storage.objects
  for select using (
    bucket_id = 'documents'
    and exists (
      select 1 from student_profiles
      join agencies on agencies.id = student_profiles.agency_id
      where agencies.subdomain = (storage.foldername(name))[1]
        and student_profiles.id::text = (storage.foldername(name))[2]
        and lower(student_profiles.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Storage Policies: Student Tracking Workbooks
drop policy if exists "Agency members read student tracking files" on storage.objects;
drop policy if exists "Agency members upload student tracking files" on storage.objects;
drop policy if exists "Agency members update student tracking files" on storage.objects;
drop policy if exists "Agency members delete student tracking files" on storage.objects;
create policy "Agency members read student tracking files" on storage.objects
  for select using (
    bucket_id = 'student-tracking-files'
    and (storage.foldername(name))[1] in (
      select agencies.subdomain from agencies where agencies.id = get_user_agency_id()
    )
  );
create policy "Agency members upload student tracking files" on storage.objects
  for insert with check (
    bucket_id = 'student-tracking-files'
    and (storage.foldername(name))[1] in (
      select agencies.subdomain from agencies where agencies.id = get_user_agency_id()
    )
  );
create policy "Agency members update student tracking files" on storage.objects
  for update using (
    bucket_id = 'student-tracking-files'
    and (storage.foldername(name))[1] in (
      select agencies.subdomain from agencies where agencies.id = get_user_agency_id()
    )
  );
create policy "Agency members delete student tracking files" on storage.objects
  for delete using (
    bucket_id = 'student-tracking-files'
    and (storage.foldername(name))[1] in (
      select agencies.subdomain from agencies where agencies.id = get_user_agency_id()
    )
  );

-- 14. Lead & Sales CRM MVP
create table if not exists sales_leads (
  id                    uuid primary key default uuid_generate_v4(),
  agency_id             uuid references agencies(id) on delete cascade not null,
  assigned_to_id        uuid references users(id) on delete set null,
  full_name             text not null,
  email                 text,
  phone                 text,
  whatsapp_number       text,
  source                text check (source in ('Website', 'Facebook', 'Walk-in', 'Referral', 'Phone', 'Other')) default 'Website' not null,
  status                text check (status in ('New', 'Contacted', 'Qualified', 'Converted', 'Lost')) default 'New' not null,
  score                 integer check (score >= 0 and score <= 100) default 10 not null,
  preferred_country     text,
  program_level         text,
  desired_university    text,
  preferred_intake      text,
  notes                 text,
  lost_reason           text,
  converted_student_id  uuid references student_profiles(id) on delete set null,
  converted_pipeline_id uuid references application_pipeline(id) on delete set null,
  created_at            timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at            timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint sales_leads_contact_required check (
    nullif(trim(coalesce(phone, '')), '') is not null
    or nullif(trim(coalesce(email, '')), '') is not null
  )
);

alter table task_dispatcher
  add column if not exists lead_id uuid references sales_leads(id) on delete set null;

alter table sales_leads enable row level security;

drop policy if exists "Agency members manage sales leads" on sales_leads;
create policy "Agency members manage sales leads" on sales_leads
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

create index if not exists sales_leads_agency_status_idx on sales_leads (agency_id, status);
create index if not exists sales_leads_agency_assignee_idx on sales_leads (agency_id, assigned_to_id);
create index if not exists task_dispatcher_lead_id_idx on task_dispatcher (lead_id);

-- 15. Student Portal Upgrade
alter table document_vault add column if not exists version_number integer default 1 not null;
alter table document_vault add column if not exists is_current boolean default true not null;
alter table document_vault add column if not exists uploaded_by text check (uploaded_by in ('student_portal', 'staff')) default 'staff' not null;

create index if not exists document_vault_student_type_current_idx
  on document_vault (agency_id, student_id, type, is_current);

-- 16. Course & University Search Engine
alter table partner_universities add column if not exists ranking integer;
alter table partner_universities add column if not exists tuition_fee_min numeric;
alter table partner_universities add column if not exists tuition_fee_max numeric;
alter table partner_universities add column if not exists intakes text[] default '{}'::text[];
alter table partner_universities add column if not exists application_deadline date;
alter table partner_universities add column if not exists program_levels text[] default '{}'::text[];

create index if not exists partner_universities_country_idx on partner_universities (country);
create index if not exists partner_universities_deadline_idx on partner_universities (application_deadline);
