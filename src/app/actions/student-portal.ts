'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { buildStudentProfileUpdate, normalizePortalEmail } from '@/lib/student-portal'

type ActionResult = {
  error?: string
  success?: string
}

export async function requestStudentMagicLink(
  agencyId: string,
  formData: FormData
): Promise<ActionResult> {
  const email = normalizePortalEmail(String(formData.get('email') ?? ''))

  if (!email) return { error: 'Enter your student email address.' }

  return sendStudentPortalMagicLink(agencyId, email)
}

export async function sendStudentPortalMagicLink(
  agencyId: string,
  emailAddress: string
): Promise<ActionResult> {
  const email = normalizePortalEmail(emailAddress)

  if (!email) return { error: 'Enter a student email address.' }

  const admin = await createAdminClient()
  const { data: agency } = await admin
    .from('agencies')
    .select('id, subdomain')
    .eq('subdomain', agencyId)
    .single()

  if (!agency) return { error: 'This student portal is not available.' }

  const { data: student } = await admin
    .from('student_profiles')
    .select('id')
    .eq('agency_id', agency.id)
    .ilike('email', email)
    .maybeSingle()

  if (!student) {
    return {
      error:
        'We could not find a student profile for this email. Please contact your counselor.',
    }
  }

  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const redirectTo = `${origin}/portal/${agencyId}/dashboard`
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })

  if (error) return { error: error.message }

  return { success: 'Check your email for a secure login link.' }
}

export async function updateStudentPortalProfile(
  agencyId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return { error: 'Please sign in again before updating your profile.' }

  const email = normalizePortalEmail(user.email)
  const admin = await createAdminClient()
  const { data: agency } = await admin
    .from('agencies')
    .select('id, subdomain')
    .eq('subdomain', agencyId)
    .single()

  if (!agency) return { error: 'This student portal is not available.' }

  const { data: student } = await admin
    .from('student_profiles')
    .select('id')
    .eq('agency_id', agency.id)
    .ilike('email', email)
    .maybeSingle()

  if (!student) return { error: 'This email is not linked to a student profile.' }

  const { error } = await admin
    .from('student_profiles')
    .update(buildStudentProfileUpdate(formData))
    .eq('agency_id', agency.id)
    .eq('id', student.id)

  if (error) return { error: error.message }

  revalidatePath(`/portal/${agencyId}/dashboard`)
  return { success: 'Profile updated successfully.' }
}

export async function createStudentPortalDocument(
  agencyId: string,
  path: string,
  fileName: string,
  fileUrl: string,
  fileType: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return { error: 'Please sign in again before uploading.' }

  const email = normalizePortalEmail(user.email)
  const admin = await createAdminClient()
  const { data: agency } = await admin
    .from('agencies')
    .select('id, subdomain')
    .eq('subdomain', agencyId)
    .single()

  if (!agency) return { error: 'This student portal is not available.' }

  const { data: student } = await admin
    .from('student_profiles')
    .select('id')
    .eq('agency_id', agency.id)
    .ilike('email', email)
    .maybeSingle()

  if (!student) return { error: 'This email is not linked to a student profile.' }
  if (!path.startsWith(`${agencyId}/${student.id}/`)) {
    return { error: 'Upload path does not match your student profile.' }
  }

  const { data: latestDocument } = await admin
    .from('document_vault')
    .select('version_number')
    .eq('agency_id', agency.id)
    .eq('student_id', student.id)
    .eq('type', fileType)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (latestDocument?.version_number ?? 0) + 1

  await admin
    .from('document_vault')
    .update({ is_current: false })
    .eq('agency_id', agency.id)
    .eq('student_id', student.id)
    .eq('type', fileType)

  const { error } = await admin.from('document_vault').insert({
    agency_id: agency.id,
    student_id: student.id,
    file_name: fileName,
    file_url: fileUrl,
    type: fileType,
    version_number: nextVersion,
    is_current: true,
    uploaded_by: 'student_portal',
    ai_parsed_data: {
      uploaded_by: 'student_portal',
      storage_path: path,
    },
  })

  if (error) return { error: error.message }

  revalidatePath(`/portal/${agencyId}/documents`)
  revalidatePath(`/portal/${agencyId}/dashboard`)
  return { success: 'Document uploaded successfully.' }
}

export async function signOutStudent(agencyId: string) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/portal/${agencyId}`)
}
