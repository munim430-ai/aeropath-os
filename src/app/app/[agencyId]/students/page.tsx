import Link from 'next/link'
import { getStudents } from '@/app/actions/students'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, formatDate } from '@/lib/utils'
import { UserPlus, GraduationCap, MessageCircle } from 'lucide-react'
import { AddStudentDialog } from './add-student-dialog'

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const students = await getStudents(agencyId)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Students</h1>
          <p className="text-sm text-[#606060] mt-0.5">{students.length} total</p>
        </div>
        <AddStudentDialog agencyId={agencyId} />
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GraduationCap className="h-12 w-12 text-[#2A2A2A] mb-4" />
          <p className="text-[#A0A0A0] font-medium">No students yet</p>
          <p className="text-sm text-[#606060] mt-1">Add your first student to get started</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <Link key={s.id} href={`/app/${agencyId}/students/${s.id}`}>
              <Card className="hover:border-[#3A3A3A] transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(s.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F5F5F5] truncate">{s.full_name}</p>
                      <p className="text-xs text-[#606060] truncate">{s.email || s.nationality || 'No email'}</p>
                    </div>
                    {s.whatsapp_number && (
                      <a 
                        href={`https://wa.me/${s.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.degree_level && (
                      <Badge color="#6366f1">{s.degree_level}</Badge>
                    )}
                    {s.gpa != null && (
                      <Badge color="#10b981">GPA {s.gpa}</Badge>
                    )}
                    {s.ielts_score != null && (
                      <Badge color="#3b82f6">IELTS {s.ielts_score}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#606060] mt-3">{formatDate(s.created_at)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
