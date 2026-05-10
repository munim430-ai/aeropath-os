import ExcelJS from 'exceljs'

export const STUDENT_TRACKING_SHEET = '📊 Students'

export const STUDENT_TRACKING_HEADERS = [
  'Student ID',
  'Full Name',
  'Date of Birth',
  'Passport Number',
  'Contact Number',
  'Email',
  'Responsible Consultant',
  'Batch No',
  'Desired University',
  'Program Level',
  'Destination Country',
  'Language Course',
  'SSC GPA',
  'SSC Passing Year',
  'HSC GPA',
  'HSC Passing Year',
  'Bachelor GPA',
  'IELTS / TOPIK Score',
  'Stage',
  'Payment Amount (BDT)',
  'Payment Method',
  'Payment Due (BDT)',
  'Sponsor Name',
  'Sponsor Contact',
  'Notes',
] as const

export const STUDENT_STAGES = [
  'Inquiry',
  'Docs',
  'Language',
  'Applied',
  'Interview',
  'Accepted',
  'Visa',
  'Enrolled',
] as const

export const PAYMENT_METHODS = ['BKASH', 'BANK', 'CASH'] as const

export type StudentStage = (typeof STUDENT_STAGES)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type PaymentStatus = 'Paid' | 'Partial' | 'Due'

export type StudentTrackingRow = {
  rowNumber: number
  studentId: string
  fullName: string
  dateOfBirth: string
  passportNumber: string
  contactNumber: string
  email: string
  responsibleConsultant: string
  batchNo: string
  desiredUniversity: string
  programLevel: string
  destinationCountry: string
  languageCourse: string
  sscGpa: string
  sscPassingYear: string
  hscGpa: string
  hscPassingYear: string
  bachelorGpa: string
  ieltsTopikScore: string
  stage: StudentStage
  paymentAmountBdt: number
  paymentMethod: PaymentMethod | ''
  paymentDueBdt: number
  sponsorName: string
  sponsorContact: string
  notes: string
  paymentStatus: PaymentStatus
}

export type StudentTrackingParseResult = {
  students: StudentTrackingRow[]
  error: string | null
  warnings: StudentTrackingWarning[]
}

export type StudentTrackingWarning = {
  rowNumber: number
  studentId: string
  studentName: string
  message: string
}

export type WorkbookSource =
  | { buffer: Buffer; source: 'supabase' | 'local' }
  | null

export type StudentDashboardData = {
  kpis: {
    totalStudents: number
    totalCollected: number
    totalOutstanding: number
    visaOrEnrolled: number
    activePipeline: number
  }
  stageBars: Array<{ stage: StudentStage; count: number; percent: number }>
  paymentStatus: Array<{ name: 'Fully Paid' | 'Partial' | 'No Payment'; value: number }>
  consultants: Array<{ name: string; count: number }>
  stageChart: Array<{ stage: StudentStage; count: number }>
  consultantsList: string[]
}

const HEADER_ALIASES: Record<string, keyof StudentTrackingRow> = {
  'Student ID': 'studentId',
  'Full Name': 'fullName',
  'Date of Birth': 'dateOfBirth',
  'Passport Number': 'passportNumber',
  'Contact Number': 'contactNumber',
  Email: 'email',
  'Responsible Consultant': 'responsibleConsultant',
  'Batch No': 'batchNo',
  'Desired University': 'desiredUniversity',
  'Program Level': 'programLevel',
  'Destination Country': 'destinationCountry',
  'Language Course': 'languageCourse',
  'SSC GPA': 'sscGpa',
  'SSC Passing Year': 'sscPassingYear',
  'HSC GPA': 'hscGpa',
  'HSC Passing Year': 'hscPassingYear',
  'Bachelor GPA': 'bachelorGpa',
  'IELTS / TOPIK Score': 'ieltsTopikScore',
  Stage: 'stage',
  'Payment Amount (BDT)': 'paymentAmountBdt',
  'Payment Method': 'paymentMethod',
  'Payment Due (BDT)': 'paymentDueBdt',
  'Sponsor Name': 'sponsorName',
  'Sponsor Contact': 'sponsorContact',
  Notes: 'notes',
}

export async function parseStudentTrackingWorkbook(buffer: Buffer | ArrayBuffer): Promise<StudentTrackingParseResult> {
  try {
    const workbook = new ExcelJS.Workbook()
    const nodeBuffer = buffer instanceof ArrayBuffer ? Buffer.from(new Uint8Array(buffer)) : buffer
    const workbookBuffer = nodeBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]
    await workbook.xlsx.load(workbookBuffer)
    const worksheet = workbook.getWorksheet(STUDENT_TRACKING_SHEET)

    if (!worksheet) {
      return {
        students: [],
        error: `Missing required "${STUDENT_TRACKING_SHEET}" sheet.`,
        warnings: [],
      }
    }

    const rows: unknown[][] = []
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      rows[row.number - 1] = rowValuesToArray(row.values)
    })
    const headers = normalizeRow(rows[1] ?? [])
    const missingHeaders = STUDENT_TRACKING_HEADERS.filter((header) => !headers.includes(header))

    if (missingHeaders.length > 0) {
      return {
        students: [],
        error: `Missing required columns: ${missingHeaders.join(', ')}.`,
        warnings: [],
      }
    }

    const parsedRows = rows
      .slice(2)
      .map((row, index) => parseStudentRow(headers, row, index + 3))
      .filter((student): student is { student: StudentTrackingRow; warnings: StudentTrackingWarning[] } => student !== null)

    return {
      students: parsedRows.map((row) => row.student),
      error: null,
      warnings: parsedRows.flatMap((row) => row.warnings),
    }
  } catch (error) {
    return {
      students: [],
      error: error instanceof Error ? error.message : 'Unable to read student tracking workbook.',
      warnings: [],
    }
  }
}

export function buildStudentDashboardData(students: StudentTrackingRow[]): StudentDashboardData {
  const totalStudents = students.length
  const totalCollected = students.reduce((sum, student) => sum + student.paymentAmountBdt, 0)
  const totalOutstanding = students.reduce((sum, student) => sum + student.paymentDueBdt, 0)
  const visaOrEnrolled = students.filter((student) =>
    student.stage === 'Visa' || student.stage === 'Enrolled'
  ).length
  const activePipeline = students.filter((student) =>
    student.stage === 'Applied' || student.stage === 'Interview' || student.stage === 'Accepted'
  ).length

  const stageBars = STUDENT_STAGES.map((stage) => {
    const count = students.filter((student) => student.stage === stage).length
    return {
      stage,
      count,
      percent: totalStudents === 0 ? 0 : Math.round((count / totalStudents) * 100),
    }
  })

  const fullyPaid = students.filter((student) =>
    student.paymentDueBdt === 0 && student.paymentAmountBdt > 0
  ).length
  const partial = students.filter((student) =>
    student.paymentDueBdt > 0 && student.paymentAmountBdt > 0
  ).length
  const noPayment = students.filter((student) => student.paymentAmountBdt === 0).length

  const consultantCounts = new Map<string, number>()
  for (const student of students) {
    const consultant = student.responsibleConsultant || 'Unassigned'
    consultantCounts.set(consultant, (consultantCounts.get(consultant) ?? 0) + 1)
  }

  const consultants = Array.from(consultantCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  return {
    kpis: {
      totalStudents,
      totalCollected,
      totalOutstanding,
      visaOrEnrolled,
      activePipeline,
    },
    stageBars,
    paymentStatus: [
      { name: 'Fully Paid', value: fullyPaid },
      { name: 'Partial', value: partial },
      { name: 'No Payment', value: noPayment },
    ],
    consultants,
    stageChart: stageBars
      .filter((stage) => stage.count > 0)
      .map(({ stage, count }) => ({ stage, count })),
    consultantsList: consultants.map((consultant) => consultant.name),
  }
}

export function resolveStudentTrackingWorkbookSource({
  allowLocalFallback,
  local,
  remote,
}: {
  allowLocalFallback: boolean
  local: Buffer | null
  remote: Buffer | null
}): WorkbookSource {
  if (remote) return { buffer: remote, source: 'supabase' }
  if (allowLocalFallback && local) return { buffer: local, source: 'local' }
  return null
}

export async function buildBlankStudentTrackingWorkbook() {
  return buildBlankWorkbookBuffer()
}

export async function buildBlankStudentTrackingArrayBuffer() {
  return buildBlankWorkbookArrayBuffer()
}

function parseStudentRow(headers: string[], row: unknown[], rowNumber: number) {
  if (normalizeRow(row).every((value) => value === '')) return null
  const warnings: StudentTrackingWarning[] = []

  const base: StudentTrackingRow = {
    rowNumber,
    studentId: '',
    fullName: '',
    dateOfBirth: '',
    passportNumber: '',
    contactNumber: '',
    email: '',
    responsibleConsultant: '',
    batchNo: '',
    desiredUniversity: '',
    programLevel: '',
    destinationCountry: '',
    languageCourse: '',
    sscGpa: '',
    sscPassingYear: '',
    hscGpa: '',
    hscPassingYear: '',
    bachelorGpa: '',
    ieltsTopikScore: '',
    stage: 'Inquiry',
    paymentAmountBdt: 0,
    paymentMethod: '',
    paymentDueBdt: 0,
    sponsorName: '',
    sponsorContact: '',
    notes: '',
    paymentStatus: 'Due',
  }

  headers.forEach((header, index) => {
    const key = HEADER_ALIASES[header]
    if (!key) return

    const value = normalizeCell(row[index])
    if (key === 'stage') {
      const normalized = normalizeStage(value)
      base.stage = normalized.value
      if (!normalized.valid && value) {
        warnings.push(buildWarning(base, rowNumber, `Invalid Stage "${value}"; defaulted to Inquiry`))
      }
    } else if (key === 'paymentAmountBdt' || key === 'paymentDueBdt') {
      const normalized = normalizeNumber(value)
      base[key] = normalized.value
      if (!normalized.valid && value) {
        warnings.push(buildWarning(base, rowNumber, `Invalid ${header} "${value}"; defaulted to 0`))
      }
    } else if (key === 'paymentMethod') {
      const normalized = normalizePaymentMethod(value)
      base.paymentMethod = normalized.value
      if (!normalized.valid && value) {
        warnings.push(buildWarning(base, rowNumber, `Invalid Payment Method "${value}"`))
      }
    } else if (key !== 'rowNumber' && key !== 'paymentStatus') {
      base[key] = value as never
    }
  })

  if (!base.studentId) warnings.unshift(buildWarning(base, rowNumber, 'Missing Student ID'))
  if (!base.fullName) {
    const insertIndex = base.studentId ? 0 : 1
    warnings.splice(insertIndex, 0, buildWarning(base, rowNumber, 'Missing Full Name'))
  }

  base.paymentStatus = getPaymentStatus(base.paymentAmountBdt, base.paymentDueBdt)
  return { student: base, warnings }
}

async function buildBlankWorkbookBuffer() {
  const workbook = buildBlankWorkbook()
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function buildBlankWorkbookArrayBuffer() {
  const workbook = buildBlankWorkbook()
  return workbook.xlsx.writeBuffer()
}

function buildBlankWorkbook() {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(STUDENT_TRACKING_SHEET)
  worksheet.addRow(['Student Information', '', '', '', '', '', 'Agency Management', '', '', '', '', '', 'Academic History', '', '', '', '', '', 'Application', 'Payment', '', '', 'Sponsor', '', 'Notes'])
  worksheet.addRow([...STUDENT_TRACKING_HEADERS])
  return workbook
}

function rowValuesToArray(values: ExcelJS.CellValue[] | { [key: string]: ExcelJS.CellValue }) {
  if (!Array.isArray(values)) return []
  return values.slice(1)
}


function normalizeRow(row: unknown[]) {
  return row.map((cell) => normalizeCell(cell))
}

function normalizeCell(value: unknown) {
  if (value == null) return ''
  return String(value).trim()
}

function normalizeNumber(value: string) {
  const normalized = Number(value.replace(/,/g, ''))
  return Number.isFinite(normalized)
    ? { value: normalized, valid: true }
    : { value: 0, valid: false }
}

function normalizeStage(value: string): { value: StudentStage; valid: boolean } {
  const match = STUDENT_STAGES.find((stage) => stage.toLowerCase() === value.toLowerCase())
  return { value: match ?? 'Inquiry', valid: Boolean(match) }
}

function normalizePaymentMethod(value: string): { value: PaymentMethod | ''; valid: boolean } {
  const match = PAYMENT_METHODS.find((method) => method.toLowerCase() === value.toLowerCase())
  return { value: match ?? '', valid: Boolean(match) }
}

function getPaymentStatus(paymentAmountBdt: number, paymentDueBdt: number): PaymentStatus {
  if (paymentDueBdt === 0 && paymentAmountBdt > 0) return 'Paid'
  if (paymentDueBdt > 0 && paymentAmountBdt > 0) return 'Partial'
  return 'Due'
}

function buildWarning(student: StudentTrackingRow, rowNumber: number, message: string): StudentTrackingWarning {
  return {
    rowNumber,
    studentId: student.studentId,
    studentName: student.fullName,
    message,
  }
}
