'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient, getAgencyUUID } from '@/lib/supabase/server'
import {
  STUDENT_TRACKING_BUCKET,
  getStudentTrackingStoragePath,
  readCurrentStudentTrackingWorkbook,
  validateStudentTrackingBuffer,
  writeBlankStudentTrackingWorkbook,
  writeCanonicalStudentTrackingWorkbook,
} from '@/lib/student-tracking.server'

type ActionResult = {
  error?: string
  success?: string
  url?: string
}

export async function uploadStudentTrackingWorkbook(
  agencyId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const agencyUuid = await getAgencyUUID(agencyId)
    if (!agencyUuid) return { error: 'Unauthorized' }

    const file = formData.get('file')
    if (!(file instanceof File)) return { error: 'Choose an Excel file to upload.' }
    if (!file.name.toLowerCase().endsWith('.xlsx')) return { error: 'Upload an .xlsx workbook.' }
    if (file.size > 10 * 1024 * 1024) return { error: 'Workbook must be 10 MB or smaller.' }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await validateStudentTrackingBuffer(buffer)
    if (parsed.error) return { error: parsed.error }

    await writeCanonicalStudentTrackingWorkbook(buffer)
    const uploadError = await mirrorStudentTrackingWorkbook(agencyId, buffer)
    if (uploadError) return { error: uploadError }
    const metadataError = await saveStudentTrackingUploadMetadata({
      agencyId,
      agencyUuid,
      fileName: file.name,
      rowCount: parsed.students.length,
      status: 'Uploaded',
    })
    if (metadataError) return { error: metadataError }

    revalidatePath(`/app/${agencyId}/students`)
    return { success: 'Student tracking workbook uploaded.' }
  } catch (error) {
    return { error: getActionErrorMessage(error) }
  }
}

export async function clearStudentTrackingRows(agencyId: string): Promise<ActionResult> {
  try {
    const agencyUuid = await getAgencyUUID(agencyId)
    if (!agencyUuid) return { error: 'Unauthorized' }

    const buffer = await writeBlankStudentTrackingWorkbook()
    const uploadError = await mirrorStudentTrackingWorkbook(agencyId, buffer)
    if (uploadError) return { error: uploadError }
    const metadataError = await saveStudentTrackingUploadMetadata({
      agencyId,
      agencyUuid,
      fileName: 'AeroPath_Student_Template.xlsx',
      rowCount: 0,
      status: 'Cleared',
    })
    if (metadataError) return { error: metadataError }

    revalidatePath(`/app/${agencyId}/students`)
    return { success: 'Student tracking rows cleared.' }
  } catch (error) {
    return { error: getActionErrorMessage(error) }
  }
}

export async function getStudentTrackingDownloadUrl(agencyId: string): Promise<ActionResult> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const admin = await createAdminClient()
  await ensureStudentTrackingBucket()
  let signedUrl = await admin.storage
    .from(STUDENT_TRACKING_BUCKET)
    .createSignedUrl(getStudentTrackingStoragePath(agencyId), 60 * 5, {
      download: 'AeroPath_Student_Template.xlsx',
    })

  if (signedUrl.error && process.env.NODE_ENV !== 'production') {
    const currentWorkbook = await readCurrentStudentTrackingWorkbook()
    if (currentWorkbook) {
      const mirrorError = await mirrorStudentTrackingWorkbook(agencyId, currentWorkbook)
      if (mirrorError) return { error: mirrorError }
      signedUrl = await admin.storage
        .from(STUDENT_TRACKING_BUCKET)
        .createSignedUrl(getStudentTrackingStoragePath(agencyId), 60 * 5, {
          download: 'AeroPath_Student_Template.xlsx',
        })
    }
  }

  if (signedUrl.error) return { error: signedUrl.error.message }
  return { url: signedUrl.data.signedUrl }
}

async function mirrorStudentTrackingWorkbook(agencyId: string, buffer: Buffer) {
  const admin = await createAdminClient()
  const bucketError = await ensureStudentTrackingBucket()
  if (bucketError) return bucketError

  const { error } = await admin.storage
    .from(STUDENT_TRACKING_BUCKET)
    .upload(getStudentTrackingStoragePath(agencyId), buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    })

  return error?.message
}

async function saveStudentTrackingUploadMetadata({
  agencyId,
  agencyUuid,
  fileName,
  rowCount,
  status,
}: {
  agencyId: string
  agencyUuid: string
  fileName: string
  rowCount: number
  status: 'Uploaded' | 'Cleared'
}) {
  const [admin, supabase] = await Promise.all([createAdminClient(), createClient()])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await admin.from('student_tracking_uploads').upsert(
    {
      agency_id: agencyUuid,
      file_name: fileName,
      storage_path: getStudentTrackingStoragePath(agencyId),
      row_count: rowCount,
      uploaded_by_email: user?.email ?? null,
      status,
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: 'agency_id' }
  )
  return error?.message
}

async function ensureStudentTrackingBucket() {
  const admin = await createAdminClient()
  const { error } = await admin.storage.createBucket(STUDENT_TRACKING_BUCKET, {
    public: false,
    fileSizeLimit: 1024 * 1024 * 10,
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ],
  })

  if (error && !error.message.toLowerCase().includes('already exists')) {
    return error.message
  }

  return undefined
}

function getActionErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Student tracking operation failed.'
}
