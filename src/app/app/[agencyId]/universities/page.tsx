import { createClient } from '@/lib/supabase/server'
import { clearAgencyUniversities } from '@/app/actions/admin-controls'
import { DangerCleanupButton } from '@/components/danger-cleanup-button'
import { getCleanupSummary } from '@/lib/admin-controls'
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
  const universities = (universitiesResult.data ?? []) as PartnerUniversity[]
  const agencyUniversityCount = universities.filter((university) => university.agency_id === agency?.id).length

  return (
    <UniversitiesSearch
      agencyId={agencyId}
      universities={universities}
      students={(studentsResult.data ?? []) as StudentProfile[]}
      actions={
        <>
          <AddUniversityDialog agencyId={agencyId} />
          <DangerCleanupButton
            action={clearAgencyUniversities.bind(null, agencyId)}
            buttonLabel="Clear Universities"
            title="Clear agency universities?"
            description={`${getCleanupSummary({ universityCount: agencyUniversityCount })} Related pipeline applications for those universities will also be removed.`}
            confirmLabel="Clear Universities"
            onSuccessMessage={(result) =>
              `Removed ${result.deletedCount ?? 0} universities and ${result.deletedPipelineCount ?? 0} related applications`
            }
          />
        </>
      }
    />
  )
}
