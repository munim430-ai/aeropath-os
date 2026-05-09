'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAgencyUUID } from '@/lib/supabase/server'
import { normalizeWebsiteContent } from '@/lib/website-content'
import type { WebsiteContentData } from '@/lib/types'

export async function getWebsiteContent(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('website_content')
    .select('*')
    .eq('agency_id', agencyUuid)
    .maybeSingle()

  if (!data) {
    return {
      id: '',
      agency_id: agencyUuid,
      content: normalizeWebsiteContent(null),
      is_published: false,
      published_at: null,
      created_at: '',
      updated_at: '',
    }
  }

  return {
    ...data,
    content: normalizeWebsiteContent(data.content),
  }
}

export async function saveWebsiteContent(
  agencyId: string,
  content: WebsiteContentData,
  publish: boolean
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const normalizedContent = normalizeWebsiteContent(content)
  const now = new Date().toISOString()

  const { error } = await supabase.from('website_content').upsert(
    {
      agency_id: agencyUuid,
      content: normalizedContent,
      is_published: publish,
      published_at: publish ? now : null,
      updated_at: now,
    },
    { onConflict: 'agency_id' }
  )

  if (error) return { error: error.message }

  revalidatePath(`/app/${agencyId}/website-content`)
  return { success: true }
}
