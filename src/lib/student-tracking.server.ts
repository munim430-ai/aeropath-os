import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  buildBlankStudentTrackingWorkbook,
  buildStudentDashboardData,
  parseStudentTrackingWorkbook,
  resolveStudentTrackingWorkbookSource,
} from './student-tracking'
import type { StudentDashboardData, StudentTrackingRow } from './student-tracking'
import type { StudentTrackingWarning } from './student-tracking'
import { createAdminClient } from './supabase/server'

export const STUDENT_TRACKING_BUCKET = 'student-tracking-files'
export const STUDENT_TRACKING_FILE_NAME = 'AeroPath_Student_Template.xlsx'

const trackingDirectory = path.join(process.cwd(), 'Students Tracking')
const canonicalWorkbookPath = path.join(trackingDirectory, STUDENT_TRACKING_FILE_NAME)
const fallbackWorkbookPath = path.join(trackingDirectory, 'AeroPath_Student_Template-1.xlsx')

export type StudentTrackingReadResult = {
  students: StudentTrackingRow[]
  dashboard: StudentDashboardData
  error: string | null
  warnings: StudentTrackingWarning[]
  source: 'supabase' | 'local' | 'empty'
  upload: {
    fileName: string
    rowCount: number
    status: 'Uploaded' | 'Cleared'
    uploadedAt: string
    uploadedByEmail: string | null
  } | null
}

export async function readStudentTrackingDashboard(agencyId: string): Promise<StudentTrackingReadResult> {
  const file = resolveStudentTrackingWorkbookSource({
    remote: await readSupabaseWorkbookFile(agencyId),
    local: await readLocalWorkbookFile(),
    allowLocalFallback: process.env.NODE_ENV !== 'production',
  })

  if (!file) {
    return emptyDashboard('Student tracking workbook not found.', 'empty')
  }

  const parsed = await parseStudentTrackingWorkbook(file.buffer)
  return {
    students: parsed.students,
    dashboard: buildStudentDashboardData(parsed.students),
    error: parsed.error,
    warnings: parsed.warnings,
    source: file.source,
    upload: await readStudentTrackingUploadMetadata(agencyId),
  }
}

export async function readCurrentStudentTrackingWorkbook() {
  return readLocalWorkbookFile()
}

export async function validateStudentTrackingBuffer(buffer: Buffer) {
  return parseStudentTrackingWorkbook(buffer)
}

export async function writeCanonicalStudentTrackingWorkbook(buffer: Buffer) {
  if (process.env.NODE_ENV === 'production') return
  await mkdir(trackingDirectory, { recursive: true })
  await writeFile(canonicalWorkbookPath, buffer)
}

export async function writeBlankStudentTrackingWorkbook() {
  const buffer = await buildBlankStudentTrackingWorkbook()
  await writeCanonicalStudentTrackingWorkbook(buffer)
  return buffer
}

export function getStudentTrackingStoragePath(agencyId: string) {
  return `${agencyId}/${STUDENT_TRACKING_FILE_NAME}`
}

async function readStudentTrackingUploadMetadata(agencyId: string) {
  try {
    const admin = await createAdminClient()
    const { data: agency } = await admin
      .from('agencies')
      .select('id')
      .eq('subdomain', agencyId)
      .maybeSingle()

    if (!agency) return null

    const { data } = await admin
      .from('student_tracking_uploads')
      .select('file_name, row_count, status, uploaded_at, uploaded_by_email')
      .eq('agency_id', agency.id)
      .maybeSingle()

    if (!data) return null

    return {
      fileName: data.file_name,
      rowCount: data.row_count,
      status: data.status as 'Uploaded' | 'Cleared',
      uploadedAt: data.uploaded_at,
      uploadedByEmail: data.uploaded_by_email,
    }
  } catch {
    return null
  }
}

async function readSupabaseWorkbookFile(agencyId: string) {
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin.storage
      .from(STUDENT_TRACKING_BUCKET)
      .download(getStudentTrackingStoragePath(agencyId))

    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
  } catch {
    return null
  }
}

async function readLocalWorkbookFile() {
  try {
    return await readFile(canonicalWorkbookPath)
  } catch {}

  try {
    return await readFile(fallbackWorkbookPath)
  } catch {}

  return null
}

function emptyDashboard(error: string, source: 'empty'): StudentTrackingReadResult {
  return {
    students: [],
    dashboard: buildStudentDashboardData([]),
    error,
    warnings: [],
    source,
    upload: null,
  }
}
