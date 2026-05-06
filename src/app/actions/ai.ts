'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import type { AIExtractedData, EligibilityResult } from '@/lib/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function extractDocumentData(
  rawOcrText: string
): Promise<AIExtractedData> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `You are a strict data extraction AI for an education agency CRM. Extract structured data from this academic document OCR text. 
Return ONLY valid JSON with these fields (use null if not found):
{
  "gpa": number or null (e.g. 3.75, ensure it's on a standard scale),
  "ielts_score": number or null (e.g. 7.0, must be between 0 and 9),
  "dob": "YYYY-MM-DD" or null (extract from passport or transcript if available),
  "name": "Full Name" or null,
  "degree": "Specific Degree Level" or null (CRITICAL: Explicitly recognize 'Honors' degrees, e.g., 'Bachelor of Science (Honors)' or 'BA (Hons)', do not generalize to just 'Bachelor'),
  "institution": "University Name" or null,
  "passport_number": "Alphanumeric" or null
}

If the OCR text is garbled, contradictory, or lacks any matching fields, return null for those fields.
Do not hallucinate data.

OCR Text:
${rawOcrText.slice(0, 8000)}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return {}
    return JSON.parse(jsonMatch[0]) as AIExtractedData
  } catch (error) {
    console.error('AI OCR parsing failed or returned invalid JSON:', error)
    return {}
  }
}

export async function saveDocumentWithAI(
  agencyId: string,
  studentId: string,
  fileUrl: string,
  fileName: string,
  type: string,
  ocrText: string
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const aiData = await extractDocumentData(ocrText)

  const { data: doc, error } = await supabase.from('document_vault').insert({
    agency_id: agencyUuid,
    student_id: studentId,
    type,
    file_url: fileUrl,
    file_name: fileName,
    ai_parsed_data: aiData,
  }).select().single()

  if (error) return { error: error.message }

  // Auto-update student profile if GPA or IELTS extracted
  if (aiData.gpa || aiData.ielts_score) {
    const updates: Record<string, unknown> = {}
    if (aiData.gpa) updates.gpa = aiData.gpa
    if (aiData.ielts_score) updates.ielts_score = aiData.ielts_score

    await supabase
      .from('student_profiles')
      .update(updates)
      .eq('id', studentId)
      .eq('agency_id', agencyUuid)
  }

  revalidatePath(`/app/${agencyId}/students/${studentId}`)
  return { success: true, document: doc, extracted: aiData }
}

export async function getEligibleUniversities(
  agencyId: string,
  studentId: string
): Promise<EligibilityResult[]> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return []
  const supabase = await createClient()

  const [{ data: student }, { data: universities }] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('gpa, ielts_score, degree_level')
      .eq('id', studentId)
      .eq('agency_id', agencyUuid)
      .single(),
    supabase
      .from('partner_universities')
      .select('*')
      .or(`agency_id.eq.${agencyUuid},agency_id.is.null`),
  ])

  if (!student || !universities) return []

  return universities.map((uni) => {
    const req = uni.requirements as {
      min_gpa?: number
      min_ielts?: number
      degree_levels?: string[]
    }
    const reasons: string[] = []
    let eligible = true

    if (req.min_gpa && (student.gpa ?? 0) < req.min_gpa) {
      eligible = false
      reasons.push(`GPA ${student.gpa ?? 'N/A'} below minimum ${req.min_gpa}`)
    }
    if (req.min_ielts && (student.ielts_score ?? 0) < req.min_ielts) {
      eligible = false
      reasons.push(`IELTS ${student.ielts_score ?? 'N/A'} below minimum ${req.min_ielts}`)
    }
    if (
      req.degree_levels?.length &&
      student.degree_level &&
      !req.degree_levels.includes(student.degree_level)
    ) {
      eligible = false
      reasons.push(`Degree level mismatch`)
    }

    if (eligible) reasons.push('Meets all requirements')

    return { university: uni, eligible, reasons }
  })
}
