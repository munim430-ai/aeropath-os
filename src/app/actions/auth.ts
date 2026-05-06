'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  const { data: userData } = await supabase
    .from('users')
    .select('agency_id, agencies(subdomain)')
    .eq('auth_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()

  if (!userData) return { error: 'User record not found' }

  const agency = (userData as unknown as { agencies: { subdomain: string } | null }).agencies
  redirect(`/app/${agency?.subdomain ?? ''}`)
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const agencyName = formData.get('agency_name') as string
  const fullName = formData.get('full_name') as string

  const subdomain = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
  if (authError) return { error: authError.message }
  if (!authData.user) return { error: 'Sign up failed' }

  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .insert({ name: agencyName, subdomain })
    .select()
    .single()

  if (agencyError) return { error: agencyError.message }

  const { error: userError } = await supabase.from('users').insert({
    agency_id: agency.id,
    auth_id: authData.user.id,
    email,
    full_name: fullName,
    role: 'Owner',
  })

  if (userError) return { error: userError.message }

  redirect(`/app/${subdomain}`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
