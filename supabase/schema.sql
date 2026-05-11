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
  role            text check (role in ('SuperAdmin', 'Owner', 'Manager', 'Counselor', 'Receptionist', 'Consultant', 'Student')) default 'Consultant',
  status          text check (status in ('Active', 'Invited', 'Disabled')) default 'Active' not null,
  invited_at      timestamp with time zone,
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
  date_of_birth   date,
  nationality     text,
  degree_level    text,
  gpa             numeric,
  ielts_score     numeric,
  whatsapp_number text,
  preferred_country text,
  preferred_intake  text,
  ssc_gpa         numeric,
  ssc_passing_year integer,
  hsc_gpa         numeric,
  hsc_passing_year integer,
  preferred_subject text,
  test_type       text check (test_type in ('IELTS', 'PTE', 'TOEFL', 'TOPIK', 'Other')),
  overall_test_score numeric,
  listening_score numeric,
  reading_score   numeric,
  writing_score   numeric,
  speaking_score  numeric,
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
  student_id      uuid references student_profiles(id) on delete set null,
  date            date default current_date,
  description     text,
  category        text,
  payment_method  text check (payment_method in ('BKASH', 'BANK', 'CASH', 'Stripe', 'PayPal', 'Other')),
  vendor_name     text,
  reference_no    text,
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

-- 11b. Student Payments
create table if not exists student_payments (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  student_id      uuid references student_profiles(id) on delete cascade not null,
  pipeline_id     uuid references application_pipeline(id) on delete set null,
  payment_date    date default current_date not null,
  description     text,
  purpose         text check (purpose in ('Service Charge', 'University Fee', 'Visa Fee', 'Other')) default 'Service Charge' not null,
  method          text check (method in ('BKASH', 'BANK', 'CASH', 'Stripe', 'PayPal', 'Other')) default 'CASH' not null,
  amount          numeric not null,
  invoice_no      text,
  receipt_no      text,
  notes           text,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11c. HRM Attendance
create table if not exists hrm_attendance (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  user_id         uuid references users(id) on delete cascade not null,
  attendance_date date default current_date not null,
  clock_in_at     timestamp with time zone,
  clock_out_at    timestamp with time zone,
  status          text check (status in ('Present', 'Late', 'Absent', 'Leave')) default 'Present' not null,
  notes           text,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (agency_id, user_id, attendance_date)
);

-- 11d. Staff Invites
create table if not exists staff_invites (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  email           text not null,
  full_name       text,
  role            text check (role in ('Owner', 'Manager', 'Counselor', 'Receptionist', 'Consultant')) default 'Consultant' not null,
  status          text check (status in ('Pending', 'Accepted', 'Revoked')) default 'Pending' not null,
  invited_by_id   uuid references users(id) on delete set null,
  auth_user_id    uuid,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  accepted_at     timestamp with time zone,
  unique (agency_id, email)
);

-- 11e. Student Profile Experience & Visa History
create table if not exists student_work_experiences (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  student_id      uuid references student_profiles(id) on delete cascade not null,
  company_name    text not null,
  designation     text,
  period          text,
  certificate_url text,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists student_visa_histories (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  student_id      uuid references student_profiles(id) on delete cascade not null,
  country_name    text not null,
  visa_category   text,
  outcome         text check (outcome in ('Approved', 'Rejected', 'Pending', 'Withdrawn')) not null,
  year            integer,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11f. Sub-Agent Partners
create table if not exists sub_agents (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  name            text not null,
  contact_name    text,
  email           text,
  phone           text,
  status          text check (status in ('Active', 'Disabled')) default 'Active' not null,
  commission_rate numeric default 0 not null,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11g. Audit Logs
create table if not exists audit_logs (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  actor_user_id   uuid references users(id) on delete set null,
  action          text not null,
  entity_type     text not null,
  entity_id       uuid,
  metadata        jsonb default '{}'::jsonb not null,
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
alter table student_profiles add column if not exists date_of_birth date;
alter table student_profiles add column if not exists ssc_gpa numeric;
alter table student_profiles add column if not exists ssc_passing_year integer;
alter table student_profiles add column if not exists hsc_gpa numeric;
alter table student_profiles add column if not exists hsc_passing_year integer;
alter table student_profiles add column if not exists preferred_subject text;
alter table student_profiles add column if not exists test_type text
  check (test_type in ('IELTS', 'PTE', 'TOEFL', 'TOPIK', 'Other'));
alter table student_profiles add column if not exists overall_test_score numeric;
alter table student_profiles add column if not exists listening_score numeric;
alter table student_profiles add column if not exists reading_score numeric;
alter table student_profiles add column if not exists writing_score numeric;
alter table student_profiles add column if not exists speaking_score numeric;
alter table student_profiles add column if not exists sub_agent_id uuid references sub_agents(id) on delete set null;

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
alter table student_payments enable row level security;
alter table hrm_attendance enable row level security;
alter table staff_invites enable row level security;
alter table student_work_experiences enable row level security;
alter table student_visa_histories enable row level security;
alter table sub_agents enable row level security;
alter table audit_logs enable row level security;
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

drop policy if exists "Agency members manage student payments" on student_payments;
create policy "Agency members manage student payments" on student_payments for all using (agency_id = get_user_agency_id());

drop policy if exists "Agency members manage attendance" on hrm_attendance;
create policy "Agency members manage attendance" on hrm_attendance for all using (agency_id = get_user_agency_id());

drop policy if exists "Agency members read staff invites" on staff_invites;
drop policy if exists "Agency owners manage staff invites" on staff_invites;
create policy "Agency members read staff invites" on staff_invites
  for select using (agency_id = get_user_agency_id());
create policy "Agency owners manage staff invites" on staff_invites
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

drop policy if exists "Agency members manage student work experiences" on student_work_experiences;
drop policy if exists "Agency members manage student visa histories" on student_visa_histories;
create policy "Agency members manage student work experiences" on student_work_experiences
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());
create policy "Agency members manage student visa histories" on student_visa_histories
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

drop policy if exists "Agency members manage sub agents" on sub_agents;
create policy "Agency members manage sub agents" on sub_agents
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

drop policy if exists "Agency members read audit logs" on audit_logs;
drop policy if exists "Agency members insert audit logs" on audit_logs;
create policy "Agency members read audit logs" on audit_logs
  for select using (agency_id = get_user_agency_id());
create policy "Agency members insert audit logs" on audit_logs
  for insert with check (agency_id = get_user_agency_id());

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
  source                text check (source in ('Website', 'Facebook', 'Instagram', 'YouTube', 'TikTok', 'Walk-in', 'Referral', 'Phone', 'Other')) default 'Website' not null,
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

-- 17. Application & Visa Operations MVP
alter table application_pipeline add column if not exists visa_status text
  check (visa_status in ('Not Started', 'Preparing', 'Submitted', 'Approved', 'Rejected'))
  default 'Not Started';
alter table application_pipeline add column if not exists deadline_date date;
alter table application_pipeline add column if not exists submitted_at timestamp with time zone;
alter table application_pipeline add column if not exists decision_at timestamp with time zone;

create table if not exists application_checklists (
  id            uuid primary key default uuid_generate_v4(),
  agency_id     uuid references agencies(id) on delete cascade not null,
  pipeline_id   uuid references application_pipeline(id) on delete cascade not null,
  country       text,
  template_key  text not null default 'Generic',
  created_at    timestamp with time zone default now() not null,
  unique (pipeline_id)
);

create table if not exists application_checklist_items (
  id            uuid primary key default uuid_generate_v4(),
  agency_id     uuid references agencies(id) on delete cascade not null,
  checklist_id  uuid references application_checklists(id) on delete cascade not null,
  pipeline_id   uuid references application_pipeline(id) on delete cascade not null,
  title         text not null,
  description   text,
  status        text check (status in ('Pending', 'Completed', 'Not Required')) default 'Pending' not null,
  is_required   boolean default true not null,
  sort_order    integer default 0 not null,
  notes         text,
  completed_at  timestamp with time zone,
  created_at    timestamp with time zone default now() not null
);

alter table application_checklists enable row level security;
alter table application_checklist_items enable row level security;

drop policy if exists "Agency members manage application checklists" on application_checklists;
drop policy if exists "Agency members manage application checklist items" on application_checklist_items;
create policy "Agency members manage application checklists" on application_checklists
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());
create policy "Agency members manage application checklist items" on application_checklist_items
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

create index if not exists application_checklists_pipeline_idx on application_checklists (pipeline_id);
create index if not exists application_checklist_items_pipeline_idx on application_checklist_items (pipeline_id);
create index if not exists application_pipeline_deadline_idx on application_pipeline (deadline_date);

-- 18. Finance & Accounting MVP
-- Run this appended block only on existing databases.
alter table cash_ledger add column if not exists student_id uuid references student_profiles(id) on delete set null;
alter table cash_ledger add column if not exists payment_method text
  check (payment_method in ('BKASH', 'BANK', 'CASH', 'Stripe', 'PayPal', 'Other'));
alter table cash_ledger add column if not exists vendor_name text;
alter table cash_ledger add column if not exists reference_no text;

create table if not exists student_payments (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  student_id      uuid references student_profiles(id) on delete cascade not null,
  pipeline_id     uuid references application_pipeline(id) on delete set null,
  payment_date    date default current_date not null,
  description     text,
  purpose         text check (purpose in ('Service Charge', 'University Fee', 'Visa Fee', 'Other')) default 'Service Charge' not null,
  method          text check (method in ('BKASH', 'BANK', 'CASH', 'Stripe', 'PayPal', 'Other')) default 'CASH' not null,
  amount          numeric not null,
  invoice_no      text,
  receipt_no      text,
  notes           text,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table student_payments enable row level security;

drop policy if exists "Agency members manage student payments" on student_payments;
create policy "Agency members manage student payments" on student_payments
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

create index if not exists student_payments_agency_idx on student_payments (agency_id);
create index if not exists student_payments_student_idx on student_payments (student_id);
create index if not exists cash_ledger_student_idx on cash_ledger (student_id);

-- 19. HRM MVP
-- Run this appended block only on existing databases.
create table if not exists hrm_attendance (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  user_id         uuid references users(id) on delete cascade not null,
  attendance_date date default current_date not null,
  clock_in_at     timestamp with time zone,
  clock_out_at    timestamp with time zone,
  status          text check (status in ('Present', 'Late', 'Absent', 'Leave')) default 'Present' not null,
  notes           text,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (agency_id, user_id, attendance_date)
);

alter table hrm_attendance enable row level security;

drop policy if exists "Agency members manage attendance" on hrm_attendance;
create policy "Agency members manage attendance" on hrm_attendance
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

create index if not exists hrm_attendance_agency_date_idx on hrm_attendance (agency_id, attendance_date);
create index if not exists hrm_attendance_user_date_idx on hrm_attendance (user_id, attendance_date);

-- 20. RBAC & Team Management MVP
-- Run this appended block only on existing databases.
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('SuperAdmin', 'Owner', 'Manager', 'Counselor', 'Receptionist', 'Consultant', 'Student'));
alter table users add column if not exists status text
  check (status in ('Active', 'Invited', 'Disabled')) default 'Active' not null;
alter table users add column if not exists invited_at timestamp with time zone;

create table if not exists staff_invites (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  email           text not null,
  full_name       text,
  role            text check (role in ('Owner', 'Manager', 'Counselor', 'Receptionist', 'Consultant')) default 'Consultant' not null,
  status          text check (status in ('Pending', 'Accepted', 'Revoked')) default 'Pending' not null,
  invited_by_id   uuid references users(id) on delete set null,
  auth_user_id    uuid,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  accepted_at     timestamp with time zone,
  unique (agency_id, email)
);

alter table staff_invites enable row level security;

drop policy if exists "Agency members read staff invites" on staff_invites;
drop policy if exists "Agency owners manage staff invites" on staff_invites;
create policy "Agency members read staff invites" on staff_invites
  for select using (agency_id = get_user_agency_id());
create policy "Agency owners manage staff invites" on staff_invites
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

create index if not exists users_agency_role_idx on users (agency_id, role);
create index if not exists staff_invites_agency_status_idx on staff_invites (agency_id, status);

-- 21. Audit Logging & RBAC Hardening
-- Run this appended block only on existing databases.
create table if not exists audit_logs (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  actor_user_id   uuid references users(id) on delete set null,
  action          text not null,
  entity_type     text not null,
  entity_id       uuid,
  metadata        jsonb default '{}'::jsonb not null,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table audit_logs enable row level security;

drop policy if exists "Agency members read audit logs" on audit_logs;
drop policy if exists "Agency members insert audit logs" on audit_logs;
create policy "Agency members read audit logs" on audit_logs
  for select using (agency_id = get_user_agency_id());
create policy "Agency members insert audit logs" on audit_logs
  for insert with check (agency_id = get_user_agency_id());

create index if not exists audit_logs_agency_created_idx on audit_logs (agency_id, created_at desc);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- 22. Student Profile Expansion
-- Run this appended block only on existing databases.
alter table student_profiles add column if not exists date_of_birth date;
alter table student_profiles add column if not exists ssc_gpa numeric;
alter table student_profiles add column if not exists ssc_passing_year integer;
alter table student_profiles add column if not exists hsc_gpa numeric;
alter table student_profiles add column if not exists hsc_passing_year integer;
alter table student_profiles add column if not exists preferred_subject text;
alter table student_profiles add column if not exists test_type text
  check (test_type in ('IELTS', 'PTE', 'TOEFL', 'TOPIK', 'Other'));
alter table student_profiles add column if not exists overall_test_score numeric;
alter table student_profiles add column if not exists listening_score numeric;
alter table student_profiles add column if not exists reading_score numeric;
alter table student_profiles add column if not exists writing_score numeric;
alter table student_profiles add column if not exists speaking_score numeric;

create table if not exists student_work_experiences (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  student_id      uuid references student_profiles(id) on delete cascade not null,
  company_name    text not null,
  designation     text,
  period          text,
  certificate_url text,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists student_visa_histories (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  student_id      uuid references student_profiles(id) on delete cascade not null,
  country_name    text not null,
  visa_category   text,
  outcome         text check (outcome in ('Approved', 'Rejected', 'Pending', 'Withdrawn')) not null,
  year            integer,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table student_work_experiences enable row level security;
alter table student_visa_histories enable row level security;

drop policy if exists "Agency members manage student work experiences" on student_work_experiences;
drop policy if exists "Agency members manage student visa histories" on student_visa_histories;
create policy "Agency members manage student work experiences" on student_work_experiences
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());
create policy "Agency members manage student visa histories" on student_visa_histories
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

create index if not exists student_work_experiences_student_idx on student_work_experiences (agency_id, student_id);
create index if not exists student_visa_histories_student_idx on student_visa_histories (agency_id, student_id);

-- 23. CRM Source Expansion
-- Run this appended block only on existing databases.
alter table sales_leads drop constraint if exists sales_leads_source_check;
alter table sales_leads add constraint sales_leads_source_check
  check (source in ('Website', 'Facebook', 'Instagram', 'YouTube', 'TikTok', 'Walk-in', 'Referral', 'Phone', 'Other'));

-- 24. Sub-Agent Portal
-- Run this appended block only on existing databases.
create table if not exists sub_agents (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade not null,
  name            text not null,
  contact_name    text,
  email           text,
  phone           text,
  status          text check (status in ('Active', 'Disabled')) default 'Active' not null,
  commission_rate numeric default 0 not null,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table student_profiles add column if not exists sub_agent_id uuid references sub_agents(id) on delete set null;

alter table sub_agents enable row level security;

drop policy if exists "Agency members manage sub agents" on sub_agents;
create policy "Agency members manage sub agents" on sub_agents
  for all using (agency_id = get_user_agency_id())
  with check (agency_id = get_user_agency_id());

create index if not exists sub_agents_agency_idx on sub_agents (agency_id, status);
create index if not exists student_profiles_sub_agent_idx on student_profiles (agency_id, sub_agent_id);
