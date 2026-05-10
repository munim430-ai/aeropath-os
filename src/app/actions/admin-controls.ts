'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'

export async function clearApplicationPipeline(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('application_pipeline')
    .delete()
    .eq('agency_id', agencyUuid)
    .select('id')

  if (error) return { error: error.message }

  revalidateAgencyPaths(agencyId)
  return { success: true, deletedCount: data?.length ?? 0 }
}

export async function clearAgencyUniversities(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: universities, error: lookupError } = await supabase
    .from('partner_universities')
    .select('id')
    .eq('agency_id', agencyUuid)

  if (lookupError) return { error: lookupError.message }

  const universityIds = (universities ?? []).map((university) => university.id)
  if (!universityIds.length) {
    revalidateAgencyPaths(agencyId)
    return { success: true, deletedCount: 0, deletedPipelineCount: 0 }
  }

  const { data: deletedPipeline, error: pipelineError } = await supabase
    .from('application_pipeline')
    .delete()
    .eq('agency_id', agencyUuid)
    .in('university_id', universityIds)
    .select('id')

  if (pipelineError) return { error: pipelineError.message }

  const { data: deletedUniversities, error: universityError } = await supabase
    .from('partner_universities')
    .delete()
    .eq('agency_id', agencyUuid)
    .select('id')

  if (universityError) return { error: universityError.message }

  revalidateAgencyPaths(agencyId)
  return {
    success: true,
    deletedCount: deletedUniversities?.length ?? 0,
    deletedPipelineCount: deletedPipeline?.length ?? 0,
  }
}

function revalidateAgencyPaths(agencyId: string) {
  revalidatePath(`/app/${agencyId}`)
  revalidatePath(`/app/${agencyId}/pipeline`)
  revalidatePath(`/app/${agencyId}/universities`)
  revalidatePath(`/app/${agencyId}/financials`)
}
