import { createClient } from '@/lib/supabase/server'
import { UniversitiesSearch } from './universities-search'
import { AddUniversityDialog } from './add-university-dialog'
import type { PartnerUniversity, StudentProfile } from '@/lib/types'

export default async function UniversitiesPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('subdomain', agencyId)
    .single()

  const [universitiesResult, studentsResult] = await Promise.all([
    supabase
      .from('partner_universities')
      .select('*')
      .or(`agency_id.eq.${agency?.id},agency_id.is.null`)
      .order('name'),
    supabase
      .from('student_profiles')
      .select('*')
      .eq('agency_id', agency?.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <UniversitiesSearch
      agencyId={agencyId}
      universities={(universitiesResult.data ?? []) as PartnerUniversity[]}
      students={(studentsResult.data ?? []) as StudentProfile[]}
      addUniversity={<AddUniversityDialog agencyId={agencyId} />}
    />
  )
}
