import { notFound } from 'next/navigation'
import { getStudent } from '@/app/actions/students'
import { getEligibleUniversities } from '@/app/actions/ai'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, formatDate } from '@/lib/utils'
import { DocumentUpload } from './document-upload'
import { CheckCircle, XCircle, GraduationCap, FileText, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteStudentButton } from '@/components/delete-student-button'

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ agencyId: string; studentId: string }>
}) {
  const { agencyId, studentId } = await params

  const [student, eligibility] = await Promise.all([
    getStudent(agencyId, studentId),
    getEligibleUniversities(agencyId, studentId),
  ])

  if (!student) notFound()

  const supabase = await createClient()
  const { data: documents } = await supabase
    .from('document_vault')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  const eligible = eligibility.filter((e) => e.eligible)
  const ineligible = eligibility.filter((e) => !e.eligible)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-lg">{getInitials(student.full_name)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">{student.full_name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-[#606060]">Added {formatDate(student.created_at)}</p>
            {student.preferred_intake && (
              <Badge color="#6366f1" className="text-[10px]">Intake: {student.preferred_intake}</Badge>
            )}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {student.whatsapp_number && (
            <a 
              href={`https://wa.me/${student.whatsapp_number.replace(/\D/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="secondary" className="gap-2 border-green-500/20 bg-green-500/10 text-green-500 hover:bg-green-500/20">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          )}
          <DeleteStudentButton agencyId={agencyId} studentId={studentId} studentName={student.full_name} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {[
                  { label: 'Email', value: student.email },
                  { label: 'Phone', value: student.phone },
                  { label: 'WhatsApp', value: student.whatsapp_number },
                  { label: 'Target Country', value: student.preferred_country },
                  { label: 'Nationality', value: student.nationality },
                  { label: 'Degree Level', value: student.degree_level },
                  { label: 'GPA', value: student.gpa != null ? student.gpa.toString() : null },
                  { label: 'IELTS', value: student.ielts_score != null ? student.ielts_score.toString() : null },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-[#606060]">{label}</dt>
                    <dd className="text-sm text-[#F5F5F5] mt-0.5">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <DocumentUpload agencyId={agencyId} studentId={studentId} />
              </div>
            </CardHeader>
            <CardContent>
              {!documents?.length ? (
                <p className="text-xs text-[#606060] py-2">No documents uploaded</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2 p-2 rounded-[6px] bg-[#1A1A1A]">
                      <FileText className="h-4 w-4 text-[#A0A0A0] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#F5F5F5] truncate">{doc.file_name}</p>
                        <p className="text-[10px] text-[#606060]">{doc.type}</p>
                      </div>
                      {doc.ai_parsed_data && Object.keys(doc.ai_parsed_data).length > 0 && (
                        <Badge color="#10b981" className="shrink-0 text-[10px]">AI parsed</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Eligibility Matrix */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Eligible Programs</CardTitle>
                <Badge color="#10b981">{eligible.length} eligible</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {eligible.length === 0 ? (
                <p className="text-sm text-[#606060] py-4 text-center">No eligible universities found</p>
              ) : (
                <ul className="space-y-2.5">
                  {eligible.map(({ university }) => (
                    <li key={university.id} className="flex items-center gap-3 p-3 rounded-[8px] bg-[#1A1A1A]">
                      <CheckCircle className="h-4 w-4 text-[#10b981] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F5F5F5]">{university.name}</p>
                        <p className="text-xs text-[#606060]">{university.country} • {university.commission_rate}% commission</p>
                      </div>
                      <GraduationCap className="h-4 w-4 text-[#606060]" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {ineligible.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[#A0A0A0]">Not Eligible</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {ineligible.map(({ university, reasons }) => (
                    <li key={university.id} className="flex items-start gap-3 p-3 rounded-[8px] bg-[#1A1A1A]">
                      <XCircle className="h-4 w-4 text-[#606060] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-[#A0A0A0]">{university.name}</p>
                        <p className="text-xs text-[#606060]">{reasons.join(' · ')}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
