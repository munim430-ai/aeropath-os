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

const checks = [
  {
    name: 'Sub-Agent Portal',
    table: 'sub_agents',
    select: 'id, agency_id, name, contact_name, email, phone, status, commission_rate, created_at',
  },
  {
    name: 'Student sub-agent link',
    table: 'student_profiles',
    select: 'id, agency_id, sub_agent_id',
  },
  {
    name: 'Commission And Payout Tracking',
    table: 'commission_payouts',
    select: 'id, agency_id, pipeline_id, sub_agent_id, university_amount, sub_agent_amount, status, payout_date, notes, created_at, updated_at',
  },
  {
    name: 'Payroll MVP',
    table: 'payroll_records',
    select: 'id, agency_id, user_id, payroll_month, base_salary, incentives, deductions, net_salary, status, notes, created_at, updated_at',
  },
]

async function main() {
  let failed = 0
  console.log('Reconciling live Supabase schema...')

  for (const check of checks) {
    const { error } = await supabase.from(check.table).select(check.select).limit(1)
    if (error) {
      failed += 1
      console.log(`FAIL ${check.name}: ${error.message}`)
    } else {
      console.log(`OK   ${check.name}`)
    }
  }

  if (failed > 0) {
    console.log('')
    console.log('Run only the missing appended schema block(s) in Supabase SQL Editor. Do not rerun the full schema file on an existing database.')
    process.exit(1)
  }

  console.log('Live schema has the latest appended blocks required for Sub-Agent Portal, Commission Payouts, and Payroll MVP.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
