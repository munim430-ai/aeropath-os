import { readStudentTrackingDashboard } from '@/lib/student-tracking.server'
import { StudentTrackingDashboard } from './student-tracking-dashboard'

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const data = await readStudentTrackingDashboard(agencyId)

  return <StudentTrackingDashboard agencyId={agencyId} initialData={data} />
}
