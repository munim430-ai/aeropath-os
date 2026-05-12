/**
 * Deterministic demo seed for the public "demo" tenant.
 *
 * Run: npx tsx scripts/seed-demo.ts
 *
 * This resets demo-tenant business data only, keeps other tenants untouched,
 * and creates QA staff users for role-based dashboard checks.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_PASSWORD = 'Demo@12345!'

const STAFF = [
  { email: 'demo@aeropath.app', full_name: 'Olivia Rahman', role: 'Owner' },
  { email: 'manager@aeropath.app', full_name: 'Marcus Chen', role: 'Manager' },
  { email: 'counselor@aeropath.app', full_name: 'Nadia Islam', role: 'Counselor' },
  { email: 'reception@aeropath.app', full_name: 'Sara Ahmed', role: 'Receptionist' },
] as const

const SUB_AGENTS = [
  { name: 'Dhaka Study Link', contact_name: 'Rafiq Hasan', email: 'rafiq@dhakastudylink.com', phone: '+8801711002200', commission_rate: 15 },
  { name: 'Sylhet Edu Bridge', contact_name: 'Maliha Chowdhury', email: 'maliha@sylhetedubridge.com', phone: '+8801811223344', commission_rate: 12 },
  { name: 'Chattogram Global Desk', contact_name: 'Imran Karim', email: 'imran@ctgglobaldesk.com', phone: '+8801911223355', commission_rate: 10 },
]

const STUDENTS = [
  { full_name: 'Al Afser Bhuiyan', email: 'alafser@gmail.com', nationality: 'Bangladeshi', degree_level: 'Bachelor', gpa: 3.72, ielts_score: 7.0, whatsapp_number: '+8801712345678', preferred_country: 'UK', preferred_intake: 'Sept 2026', preferred_subject: 'Computer Science' },
  { full_name: 'Priya Sharma', email: 'priya.s@hotmail.com', nationality: 'Indian', degree_level: 'Master', gpa: 3.85, ielts_score: 7.5, whatsapp_number: '+919876543210', preferred_country: 'Canada', preferred_intake: 'Jan 2027', preferred_subject: 'Business Analytics' },
  { full_name: 'Nguyen Van Minh', email: 'vanminh@vn.com', nationality: 'Vietnamese', degree_level: 'Bachelor', gpa: 3.50, ielts_score: 6.5, whatsapp_number: '+84912345678', preferred_country: 'Australia', preferred_intake: 'Sept 2026', preferred_subject: 'Cybersecurity' },
  { full_name: 'Fatima Al-Hassan', email: 'fatima.h@mail.com', nationality: 'Jordanian', degree_level: 'Master', gpa: 3.90, ielts_score: 8.0, whatsapp_number: '+962791234567', preferred_country: 'UK', preferred_intake: 'Sept 2026', preferred_subject: 'Public Health' },
  { full_name: 'Carlos Rivera', email: 'crivera@gmail.com', nationality: 'Colombian', degree_level: 'Bachelor', gpa: 3.30, ielts_score: 6.0, whatsapp_number: '+573001234567', preferred_country: 'USA', preferred_intake: 'Jan 2027', preferred_subject: 'Mechanical Engineering' },
  { full_name: 'Elena Popescu', email: 'elena.p@yahoo.com', nationality: 'Romanian', degree_level: 'Master', gpa: 3.75, ielts_score: 7.0, whatsapp_number: '+40721234567', preferred_country: 'UK', preferred_intake: 'Sept 2026', preferred_subject: 'Finance' },
  { full_name: 'Kwame Asante', email: 'kwame.a@gmail.com', nationality: 'Ghanaian', degree_level: 'Bachelor', gpa: 3.60, ielts_score: 7.0, whatsapp_number: '+233241234567', preferred_country: 'Canada', preferred_intake: 'Jan 2027', preferred_subject: 'Data Science' },
  { full_name: 'Aisha Mohammed', email: 'aisha.m@email.com', nationality: 'Nigerian', degree_level: 'PhD', gpa: 3.95, ielts_score: 7.5, whatsapp_number: '+2348031234567', preferred_country: 'UK', preferred_intake: 'Sept 2026', preferred_subject: 'Biomedical Research' },
  { full_name: 'Dmitri Volkov', email: 'dvolkov@mail.ru', nationality: 'Russian', degree_level: 'Master', gpa: 3.45, ielts_score: 6.5, whatsapp_number: '+79161234567', preferred_country: 'USA', preferred_intake: 'Jan 2027', preferred_subject: 'Artificial Intelligence' },
  { full_name: 'Xinyu Zhang', email: 'xinyu.z@qq.com', nationality: 'Chinese', degree_level: 'Bachelor', gpa: 3.80, ielts_score: 7.0, whatsapp_number: '+8613912345678', preferred_country: 'Australia', preferred_intake: 'Sept 2026', preferred_subject: 'Architecture' },
]

const UNIVERSITIES = [
  { name: 'University of Toronto', country: 'Canada', ranking: 21, tuition_fee_min: 42000, tuition_fee_max: 61000, intakes: ['Jan 2027', 'Sept 2026'], application_deadline: '2026-06-18', program_levels: ['Bachelor', 'Master', 'PhD'], requirements: { min_gpa: 3.5, min_ielts: 6.5 }, commission_rate: 12 },
  { name: 'University of Melbourne', country: 'Australia', ranking: 14, tuition_fee_min: 36000, tuition_fee_max: 52000, intakes: ['Sept 2026'], application_deadline: '2026-05-28', program_levels: ['Bachelor', 'Master'], requirements: { min_gpa: 3.3, min_ielts: 6.5 }, commission_rate: 15 },
  { name: 'University of Edinburgh', country: 'UK', ranking: 22, tuition_fee_min: 31000, tuition_fee_max: 48000, intakes: ['Sept 2026'], application_deadline: '2026-05-20', program_levels: ['Master', 'PhD'], requirements: { min_gpa: 3.7, min_ielts: 7.0 }, commission_rate: 10 },
  { name: 'TU Delft', country: 'Netherlands', ranking: 47, tuition_fee_min: 22000, tuition_fee_max: 33000, intakes: ['Sept 2026'], application_deadline: '2026-07-01', program_levels: ['Master', 'PhD'], requirements: { min_gpa: 3.4, min_ielts: 6.5 }, commission_rate: 8 },
  { name: 'Monash University', country: 'Australia', ranking: 42, tuition_fee_min: 33000, tuition_fee_max: 47000, intakes: ['Jan 2027', 'Sept 2026'], application_deadline: '2026-06-05', program_levels: ['Bachelor', 'Master'], requirements: { min_gpa: 3.0, min_ielts: 6.0 }, commission_rate: 14 },
]

const STAGES = ['Lead', 'Docs', 'Applied', 'Visa', 'Enrolled'] as const
const VISA_STATUSES = ['Not Started', 'Preparing', 'Submitted', 'Approved', 'Rejected'] as const

async function ensureAuthUser(email: string, password: string) {
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) throw listError

  const existing = usersData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { seeded_demo_user: true },
    })
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { seeded_demo_user: true },
  })
  if (error) throw error
  if (!data.user) throw new Error(`Could not create auth user ${email}`)
  return data.user.id
}

async function ensureAgency() {
  const { data: existing, error: existingError } = await supabase
    .from('agencies')
    .select('id')
    .eq('subdomain', 'demo')
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return existing.id as string

  const { data, error } = await supabase
    .from('agencies')
    .insert({
      name: 'AeroPath Demo',
      subdomain: 'demo',
      primary_color: '#6366f1',
      website: 'https://aeropath-os.vercel.app',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

async function resetDemoBusinessData(agencyId: string) {
  const tables = [
    'payroll_records',
    'hrm_attendance',
    'commission_payouts',
    'application_checklist_items',
    'application_checklists',
    'financial_ledger',
    'application_pipeline',
    'task_dispatcher',
    'student_work_experiences',
    'student_visa_histories',
    'document_vault',
    'student_profiles',
    'partner_universities',
    'sub_agents',
    'sales_leads',
    'cash_ledger',
    'bank_transactions',
    'student_payments',
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('agency_id', agencyId)
    if (error && !error.message.includes('does not exist')) throw new Error(`${table}: ${error.message}`)
  }
}

async function seedStaff(agencyId: string) {
  const rows = []
  for (const staff of STAFF) {
    const authId = await ensureAuthUser(staff.email, DEMO_PASSWORD)
    rows.push({
      agency_id: agencyId,
      auth_id: authId,
      email: staff.email,
      full_name: staff.full_name,
      role: staff.role,
      status: 'Active',
    })
  }

  const { data, error } = await supabase
    .from('users')
    .upsert(rows, { onConflict: 'auth_id' })
    .select('id, email, role')
  if (error) throw error
  return data ?? []
}

async function seedCoreData(agencyId: string) {
  const { data: subAgents, error: subAgentError } = await supabase
    .from('sub_agents')
    .insert(SUB_AGENTS.map((subAgent) => ({ ...subAgent, agency_id: agencyId, status: 'Active' })))
    .select('*')
  if (subAgentError) throw subAgentError

  const { data: students, error: studentError } = await supabase
    .from('student_profiles')
    .insert(
      STUDENTS.map((student, index) => ({
        ...student,
        agency_id: agencyId,
        sub_agent_id: subAgents?.[index % (subAgents.length || 1)]?.id ?? null,
        date_of_birth: `199${index % 8}-0${(index % 8) + 1}-15`,
        ssc_gpa: 4.8,
        ssc_passing_year: 2018 + (index % 3),
        hsc_gpa: 4.7,
        hsc_passing_year: 2020 + (index % 3),
        test_type: 'IELTS',
        overall_test_score: student.ielts_score,
        listening_score: student.ielts_score,
        reading_score: student.ielts_score,
        writing_score: Math.max(0, student.ielts_score - 0.5),
        speaking_score: student.ielts_score,
      }))
    )
    .select('*')
  if (studentError) throw studentError

  const { data: universities, error: universityError } = await supabase
    .from('partner_universities')
    .insert(UNIVERSITIES.map((university) => ({ ...university, agency_id: agencyId })))
    .select('*')
  if (universityError) throw universityError

  return { subAgents: subAgents ?? [], students: students ?? [], universities: universities ?? [] }
}

async function seedOperations(agencyId: string, data: Awaited<ReturnType<typeof seedCoreData>>, staffUsers: Array<{ id: string; email: string; role: string }>) {
  const applications = []
  const owner = staffUsers.find((user) => user.role === 'Owner')
  const manager = staffUsers.find((user) => user.role === 'Manager')
  const counselor = staffUsers.find((user) => user.role === 'Counselor')

  for (let index = 0; index < 16; index++) {
    const student = data.students[index % data.students.length]
    const university = data.universities[index % data.universities.length]
    const stage = STAGES[index % STAGES.length]
    const deadlineDay = String(17 + (index % 12)).padStart(2, '0')

    const { data: pipeline, error } = await supabase
      .from('application_pipeline')
      .insert({
        agency_id: agencyId,
        student_id: student.id,
        university_id: university.id,
        stage,
        visa_status: VISA_STATUSES[index % VISA_STATUSES.length],
        deadline_date: `2026-05-${deadlineDay}`,
        notes: `${stage} workflow seeded for client review.`,
      })
      .select('*')
      .single()
    if (error) throw error
    applications.push({ ...pipeline, student, university })

    const commissionBase = Math.round((university.tuition_fee_min ?? 30000) * ((university.commission_rate ?? 10) / 100))
    await supabase.from('financial_ledger').insert({
      agency_id: agencyId,
      pipeline_id: pipeline.id,
      expected_commission: commissionBase,
      status: stage === 'Enrolled' ? 'Received' : 'Pending',
      notes: 'Seeded expected commission.',
    })

    if (index < 10) {
      await supabase.from('commission_payouts').insert({
        agency_id: agencyId,
        pipeline_id: pipeline.id,
        sub_agent_id: student.sub_agent_id,
        university_amount: commissionBase,
        sub_agent_amount: Math.round(commissionBase * 0.15),
        status: index % 4 === 0 ? 'Paid' : index % 3 === 0 ? 'Received' : 'Pending',
        payout_date: index % 4 === 0 ? '2026-05-10' : null,
        notes: 'Seeded sub-agent payout record.',
      })
    }
  }

  const taskRows = [
    ['Review urgent UK visa checklist', counselor?.id, '2026-05-14'],
    ['Confirm payroll approvals for May', manager?.id, '2026-05-16'],
    ['Call sub-agent about missing documents', counselor?.id, '2026-05-17'],
    ['Prepare executive analytics snapshot', owner?.id, '2026-05-18'],
    ['Update website success story section', manager?.id, '2026-05-19'],
  ].map(([title, assigned_to_id, due_date]) => ({
    agency_id: agencyId,
    title,
    assigned_to_id,
    due_date,
    status: 'Pending',
  }))

  await supabase.from('task_dispatcher').insert(taskRows)

  const today = new Date('2026-05-12T00:00:00.000Z')
  const attendanceRows = []
  const payrollRows = []
  for (const staff of staffUsers) {
    for (let day = 1; day <= 12; day++) {
      const date = new Date(today)
      date.setUTCDate(day)
      attendanceRows.push({
        agency_id: agencyId,
        user_id: staff.id,
        attendance_date: date.toISOString().slice(0, 10),
        clock_in_at: `${date.toISOString().slice(0, 10)}T09:1${day % 5}:00+00:00`,
        clock_out_at: `${date.toISOString().slice(0, 10)}T17:3${day % 5}:00+00:00`,
        status: day % 9 === 0 ? 'Absent' : day % 5 === 0 ? 'Late' : 'Present',
        notes: 'Seeded attendance for QA.',
      })
    }

    const baseSalary = staff.role === 'Owner' ? 120000 : staff.role === 'Manager' ? 90000 : staff.role === 'Counselor' ? 65000 : 42000
    const deductions = staff.role === 'Receptionist' ? 1200 : 500
    const incentives = staff.role === 'Counselor' ? 8000 : staff.role === 'Manager' ? 12000 : 3000
    payrollRows.push({
      agency_id: agencyId,
      user_id: staff.id,
      payroll_month: '2026-05-01',
      base_salary: baseSalary,
      incentives,
      deductions,
      net_salary: baseSalary + incentives - deductions,
      status: staff.role === 'Owner' ? 'Paid' : staff.role === 'Manager' ? 'Approved' : 'Draft',
      notes: 'Seeded May payroll for client review.',
    })
  }

  const { error: attendanceError } = await supabase.from('hrm_attendance').insert(attendanceRows)
  if (attendanceError) throw attendanceError

  const { error: payrollError } = await supabase.from('payroll_records').insert(payrollRows)
  if (payrollError) throw payrollError

  return { applications: applications.length, tasks: taskRows.length, payrollRecords: payrollRows.length, attendanceRecords: attendanceRows.length }
}

async function seed() {
  console.log('Seeding AeroPath demo tenant...')
  const agencyId = await ensureAgency()
  await resetDemoBusinessData(agencyId)
  const staffUsers = await seedStaff(agencyId)
  const coreData = await seedCoreData(agencyId)
  const operations = await seedOperations(agencyId, coreData, staffUsers)

  console.log('Demo seed complete.')
  console.log(`Agency: demo (${agencyId})`)
  console.log(`Staff users: ${staffUsers.length}`)
  console.log(`Students: ${coreData.students.length}`)
  console.log(`Sub-agents: ${coreData.subAgents.length}`)
  console.log(`Universities: ${coreData.universities.length}`)
  console.log(`Applications: ${operations.applications}`)
  console.log(`Tasks: ${operations.tasks}`)
  console.log(`Attendance records: ${operations.attendanceRecords}`)
  console.log(`Payroll records: ${operations.payrollRecords}`)
  console.log('QA login password for seeded staff: Demo@12345!')
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
