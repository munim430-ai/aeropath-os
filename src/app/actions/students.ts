'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'

export async function createStudent(agencyId: string, formData: FormData) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { error } = await supabase.from('student_profiles').insert({
    agency_id: agencyUuid,
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    nationality: formData.get('nationality') as string,
    degree_level: formData.get('degree_level') as string,
    gpa: formData.get('gpa') ? Number(formData.get('gpa')) : null,
    ielts_score: formData.get('ielts_score') ? Number(formData.get('ielts_score')) : null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/students`)
  return { success: true }
}

export async function updateStudent(
  agencyId: string,
  studentId: string,
  formData: FormData
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('student_profiles')
    .update({
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      nationality: formData.get('nationality') as string,
      degree_level: formData.get('degree_level') as string,
      gpa: formData.get('gpa') ? Number(formData.get('gpa')) : null,
      ielts_score: formData.get('ielts_score') ? Number(formData.get('ielts_score')) : null,
    })
    .eq('id', studentId)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/students/${studentId}`)
  revalidatePath(`/app/${agencyId}/students`)
  return { success: true }
}

export async function getStudents(agencyId: string, search?: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return []
  const supabase = await createClient()

  let query = supabase
    .from('student_profiles')
    .select('*')
    .eq('agency_id', agencyUuid)
    .order('created_at', { ascending: false })

  if (search) query = query.ilike('full_name', `%${search}%`)

  const { data, error } = await query
  if (error) return []
  return data
}

export async function getStudent(agencyId: string, studentId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', studentId)
    .eq('agency_id', agencyUuid)
    .single()

  if (error) return null
  return data
}
