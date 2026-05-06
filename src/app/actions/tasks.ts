'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import type { TaskStatus } from '@/lib/types'

export async function createTask(agencyId: string, formData: FormData) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { error } = await supabase.from('task_dispatcher').insert({
    agency_id: agencyUuid,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    assigned_to_id: (formData.get('assigned_to_id') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/tasks`)
  return { success: true }
}

export async function updateTaskStatus(
  agencyId: string,
  taskId: string,
  status: TaskStatus
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('task_dispatcher')
    .update({ status })
    .eq('id', taskId)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/tasks`)
  return { success: true }
}

export async function getTasks(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_dispatcher')
    .select('*, assigned_to:users(id, full_name, email)')
    .eq('agency_id', agencyUuid)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}
