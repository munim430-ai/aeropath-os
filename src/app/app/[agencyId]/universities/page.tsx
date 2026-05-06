import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap } from 'lucide-react'
import { AddUniversityDialog } from './add-university-dialog'

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

  const { data: universities } = await supabase
    .from('partner_universities')
    .select('*')
    .or(`agency_id.eq.${agency?.id},agency_id.is.null`)
    .order('name')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Partner Universities</h1>
          <p className="text-sm text-[#606060] mt-0.5">{universities?.length ?? 0} partners</p>
        </div>
        <AddUniversityDialog agencyId={agencyId} />
      </div>

      {!universities?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GraduationCap className="h-12 w-12 text-[#2A2A2A] mb-4" />
          <p className="text-[#A0A0A0]">No partner universities yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((uni) => {
            const req = uni.requirements as { min_gpa?: number; min_ielts?: number; degree_levels?: string[] }
            return (
              <Card key={uni.id}>
                <CardHeader>
                  <CardTitle>{uni.name}</CardTitle>
                  {uni.country && <p className="text-xs text-[#606060]">{uni.country}</p>}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {req.min_gpa && <Badge color="#10b981">GPA ≥ {req.min_gpa}</Badge>}
                    {req.min_ielts && <Badge color="#3b82f6">IELTS ≥ {req.min_ielts}</Badge>}
                    {req.degree_levels?.map((d) => (
                      <Badge key={d} color="#6366f1">{d}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-[#606060] mb-2">
                    Commission: <span className="text-[#F5F5F5] font-medium">{uni.commission_rate}%</span>
                  </p>
                  {uni.scholarship_info && (
                    <div className="pt-2 border-t border-[#2A2A2A]">
                      <p className="text-[10px] text-[#A0A0A0] uppercase font-semibold mb-1">Scholarships</p>
                      <p className="text-xs text-[#10b981] line-clamp-2">{uni.scholarship_info}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
