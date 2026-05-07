/**
 * Demo seed script — generates realistic demo data for sales pitches.
 * Run: npx tsx scripts/seed-demo.ts
 *
 * Creates:
 * - 1 Agency: "AeroPath Demo" (subdomain: demo)
 * - 1 Owner user (email: demo@aeropath.app / pass: Demo@12345!)
 * - 10 Student profiles
 * - 5 Partner universities
 * - 20 Applications across all pipeline stages
 * - 8 Tasks
 * - Financial ledger entries
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Copy .env.local and set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_EMAIL = 'demo@aeropath.app'
const DEMO_PASSWORD = 'Demo@12345!'

const STUDENTS = [
  { full_name: 'Al Afser Bhuiyan',   email: 'alafser@gmail.com',   nationality: 'Bangladeshi', degree_level: 'Bachelor', gpa: 3.72, ielts_score: 7.0, whatsapp_number: '+8801712345678', preferred_country: 'UK', preferred_intake: 'Sept 2026' },
  { full_name: 'Priya Sharma',        email: 'priya.s@hotmail.com', nationality: 'Indian',       degree_level: 'Master',  gpa: 3.85, ielts_score: 7.5, whatsapp_number: '+919876543210', preferred_country: 'Canada', preferred_intake: 'Jan 2027' },
  { full_name: 'Nguyen Van Minh',     email: 'vanminh@vn.com',      nationality: 'Vietnamese',   degree_level: 'Bachelor', gpa: 3.50, ielts_score: 6.5, whatsapp_number: '+84912345678', preferred_country: 'Australia', preferred_intake: 'Sept 2026' },
  { full_name: 'Fatima Al-Hassan',    email: 'fatima.h@mail.com',   nationality: 'Jordanian',    degree_level: 'Master',  gpa: 3.90, ielts_score: 8.0, whatsapp_number: '+962791234567', preferred_country: 'UK', preferred_intake: 'Sept 2026' },
  { full_name: 'Carlos Rivera',       email: 'crivera@gmail.com',   nationality: 'Colombian',    degree_level: 'Bachelor', gpa: 3.30, ielts_score: 6.0, whatsapp_number: '+573001234567', preferred_country: 'USA', preferred_intake: 'Jan 2027' },
  { full_name: 'Elena Popescu',       email: 'elena.p@yahoo.com',   nationality: 'Romanian',     degree_level: 'Master',  gpa: 3.75, ielts_score: 7.0, whatsapp_number: '+40721234567', preferred_country: 'UK', preferred_intake: 'Sept 2026' },
  { full_name: 'Kwame Asante',        email: 'kwame.a@gmail.com',   nationality: 'Ghanaian',     degree_level: 'Bachelor', gpa: 3.60, ielts_score: 7.0, whatsapp_number: '+233241234567', preferred_country: 'Canada', preferred_intake: 'Jan 2027' },
  { full_name: 'Aisha Mohammed',      email: 'aisha.m@email.com',   nationality: 'Nigerian',     degree_level: 'PhD',     gpa: 3.95, ielts_score: 7.5, whatsapp_number: '+2348031234567', preferred_country: 'UK', preferred_intake: 'Sept 2026' },
  { full_name: 'Dmitri Volkov',       email: 'dvolkov@mail.ru',     nationality: 'Russian',      degree_level: 'Master',  gpa: 3.45, ielts_score: 6.5, whatsapp_number: '+79161234567', preferred_country: 'USA', preferred_intake: 'Jan 2027' },
  { full_name: 'Xinyu Zhang',         email: 'xinyu.z@qq.com',      nationality: 'Chinese',      degree_level: 'Bachelor', gpa: 3.80, ielts_score: 7.0, whatsapp_number: '+8613912345678', preferred_country: 'Australia', preferred_intake: 'Sept 2026' },
]

const UNIVERSITIES = [
  {
    name: 'University of Toronto',
    country: 'Canada',
    requirements: { min_gpa: 3.5, min_ielts: 6.5, degree_levels: ['Bachelor', 'Master', 'PhD'] },
    commission_rate: 12,
  },
  {
    name: 'University of Melbourne',
    country: 'Australia',
    requirements: { min_gpa: 3.3, min_ielts: 6.5, degree_levels: ['Bachelor', 'Master'] },
    commission_rate: 15,
  },
  {
    name: 'University of Edinburgh',
    country: 'UK',
    requirements: { min_gpa: 3.7, min_ielts: 7.0, degree_levels: ['Master', 'PhD'] },
    commission_rate: 10,
  },
  {
    name: 'TU Delft',
    country: 'Netherlands',
    requirements: { min_gpa: 3.4, min_ielts: 6.5, degree_levels: ['Master', 'PhD'] },
    commission_rate: 8,
  },
  {
    name: 'Monash University',
    country: 'Australia',
    requirements: { min_gpa: 3.0, min_ielts: 6.0, degree_levels: ['Bachelor', 'Master'] },
    commission_rate: 14,
  },
]

const STAGES = ['Lead', 'Docs', 'Applied', 'Visa', 'Enrolled'] as const

const TASKS = [
  'Review OCR discrepancy for Al Afser Bhuiyan transcript',
  'Follow up on Priya Sharma visa appointment',
  'Collect missing documents from Carlos Rivera',
  'Send offer letter to Fatima Al-Hassan',
  'Update commission rate for University of Melbourne',
  'Schedule mock interview for Kwame Asante',
  'Verify IELTS score for Dmitri Volkov',
  'Prepare monthly pipeline report for management',
]

async function seed() {
  console.log('🌱 Seeding AeroPath Demo...\n')

  // 1. Create auth user
  console.log('1/6 Creating demo user...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })
  if (authError && !authError.message.includes('already been registered')) {
    console.error('Auth error:', authError.message)
    process.exit(1)
  }
  const authUserId = authData?.user?.id ?? (
    await supabase.auth.admin.listUsers().then(({ data }) =>
      data.users.find((u) => u.email === DEMO_EMAIL)?.id
    )
  )
  if (!authUserId) { console.error('Could not get auth user ID'); process.exit(1) }

  // 2. Create agency
  console.log('2/6 Creating agency...')
  const { data: existingAgency } = await supabase.from('agencies').select('id').eq('subdomain', 'demo').single()

  let agencyId: string
  if (existingAgency) {
    agencyId = existingAgency.id
    console.log('   Agency already exists, using existing ID')
  } else {
    const { data: agency, error: agencyError } = await supabase.from('agencies').insert({
      name: 'AeroPath Demo',
      subdomain: 'demo',
      primary_color: '#6366f1',
    }).select().single()
    if (agencyError) { console.error('Agency error:', agencyError.message); process.exit(1) }
    agencyId = agency.id
  }

  // 3. Create user record
  console.log('3/6 Creating user record...')
  const { data: existingUser } = await supabase.from('users').select('id').eq('auth_id', authUserId).single()
  if (!existingUser) {
    const { error: userError } = await supabase.from('users').insert({
      agency_id: agencyId,
      auth_id: authUserId,
      email: DEMO_EMAIL,
      full_name: 'Demo Owner',
      role: 'Owner',
    })
    if (userError) { console.error('User error:', userError.message); process.exit(1) }
  }

  // 4. Create universities
  console.log('4/6 Creating partner universities...')
  const { data: uniData, error: uniError } = await supabase
    .from('partner_universities')
    .insert(
      UNIVERSITIES.map((u) => ({ ...u, agency_id: agencyId }))
    )
    .select()
  if (uniError) { console.error('University error:', uniError.message); process.exit(1) }
  const universities = uniData ?? []

  // 5. Create students
  console.log('5/6 Creating student profiles...')
  const { data: studentData, error: studentError } = await supabase
    .from('student_profiles')
    .insert(
      STUDENTS.map((s) => ({ ...s, agency_id: agencyId }))
    )
    .select()
  if (studentError) { console.error('Student error:', studentError.message); process.exit(1) }
  const students = studentData ?? []

  // 6. Create pipeline + tasks + ledger
  console.log('6/6 Creating pipeline, tasks, and ledger...')
  let stageIdx = 0
  for (let i = 0; i < Math.min(students.length * 2, 20); i++) {
    const student = students[i % students.length]
    const university = universities[i % universities.length]
    const stage = STAGES[stageIdx % STAGES.length]
    stageIdx++

    const { data: pipeline } = await supabase.from('application_pipeline').insert({
      agency_id: agencyId,
      student_id: student.id,
      university_id: university.id,
      stage,
      intake: student.preferred_intake,
      scholarship_amount: Math.random() > 0.5 ? 5000 : 0,
    }).select().single()

    if (pipeline) {
      await supabase.from('financial_ledger').insert({
        agency_id: agencyId,
        pipeline_id: pipeline.id,
        expected_commission: Math.round(university.commission_rate * 5000) / 100 * 100,
        status: stage === 'Enrolled' ? 'Received' : 'Pending',
      })
    }
  }

  for (const title of TASKS) {
    await supabase.from('task_dispatcher').upsert(
      { agency_id: agencyId, title, status: 'Pending' },
      { onConflict: 'title' }
    )
  }

  console.log('\n✅ Demo seeded successfully!\n')
  console.log('┌─────────────────────────────────────────┐')
  console.log('│  Demo Credentials                       │')
  console.log('├─────────────────────────────────────────┤')
  console.log(`│  Email:    ${DEMO_EMAIL}        │`)
  console.log(`│  Password: ${DEMO_PASSWORD}           │`)
  console.log('│  URL:      /app/demo                    │')
  console.log('└─────────────────────────────────────────┘')
}

seed().catch(console.error)
