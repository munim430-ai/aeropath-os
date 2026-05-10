import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import ExcelJS from 'exceljs'
import {
  STUDENT_TRACKING_HEADERS,
  STUDENT_TRACKING_SHEET,
  buildBlankStudentTrackingWorkbook,
  buildStudentDashboardData,
  parseStudentTrackingWorkbook,
  resolveStudentTrackingWorkbookSource,
} from './student-tracking'

async function buildWorkbook(rows: unknown[][], sheetName = STUDENT_TRACKING_SHEET) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)
  rows.forEach((row) => worksheet.addRow(row))
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

describe('student tracking workbook parsing', () => {
  it('skips row 1, uses row 2 headers, and parses student rows from the Students sheet', async () => {
    const buffer = await buildWorkbook([
      ['Section labels to ignore'],
      STUDENT_TRACKING_HEADERS,
      [
        'ST-001',
        'Ayesha Rahman',
        '2001-04-10',
        'BX12345',
        '+8801700000000',
        'ayesha@example.com',
        'Nadia',
        'B-01',
        'University of Melbourne',
        'Bachelor',
        'Australia',
        'English',
        5,
        2017,
        4.8,
        2019,
        3.65,
        7,
        'Applied',
        120000,
        'BKASH',
        30000,
        'Mr Rahman',
        '+8801800000000',
        'Ready for application',
      ],
      [],
    ])

    const result = await parseStudentTrackingWorkbook(buffer)

    assert.equal(result.error, null)
    assert.equal(result.students.length, 1)
    assert.equal(result.students[0].studentId, 'ST-001')
    assert.equal(result.students[0].fullName, 'Ayesha Rahman')
    assert.equal(result.students[0].responsibleConsultant, 'Nadia')
    assert.equal(result.students[0].stage, 'Applied')
    assert.equal(result.students[0].paymentAmountBdt, 120000)
    assert.equal(result.students[0].paymentDueBdt, 30000)
    assert.equal(result.students[0].paymentStatus, 'Partial')
  })

  it('returns an error when the required Students sheet is missing', async () => {
    const buffer = await buildWorkbook([['Ignore'], STUDENT_TRACKING_HEADERS], 'Other')

    const result = await parseStudentTrackingWorkbook(buffer)

    assert.equal(result.students.length, 0)
    assert.match(result.error ?? '', /Students/)
  })

  it('builds dashboard metrics from parsed students', async () => {
    const students = (await parseStudentTrackingWorkbook(
      await buildWorkbook([
        ['Ignore'],
        STUDENT_TRACKING_HEADERS,
        studentRow('ST-001', 'Ayesha Rahman', 'Nadia', 'Applied', 100000, 25000),
        studentRow('ST-002', 'Karim Hossain', 'Nadia', 'Visa', 90000, 0),
        studentRow('ST-003', 'Mehedi Islam', 'Sabbir', 'Enrolled', 0, 45000),
        studentRow('ST-004', 'Rafi Ahmed', 'Sabbir', 'Interview', 30000, 10000),
      ])
    )).students

    const dashboard = buildStudentDashboardData(students)

    assert.equal(dashboard.kpis.totalStudents, 4)
    assert.equal(dashboard.kpis.totalCollected, 220000)
    assert.equal(dashboard.kpis.totalOutstanding, 80000)
    assert.equal(dashboard.kpis.visaOrEnrolled, 2)
    assert.equal(dashboard.kpis.activePipeline, 2)
    assert.deepEqual(dashboard.paymentStatus, [
      { name: 'Fully Paid', value: 1 },
      { name: 'Partial', value: 2 },
      { name: 'No Payment', value: 1 },
    ])
    assert.deepEqual(dashboard.consultants, [
      { name: 'Nadia', count: 2 },
      { name: 'Sabbir', count: 2 },
    ])
    assert.deepEqual(
      dashboard.stageBars.filter((item) => item.count > 0).map((item) => [item.stage, item.count]),
      [
        ['Applied', 1],
        ['Interview', 1],
        ['Visa', 1],
        ['Enrolled', 1],
      ]
    )
  })

  it('creates a blank template workbook with only the required headers', async () => {
    const buffer = await buildBlankStudentTrackingWorkbook()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const worksheet = workbook.getWorksheet(STUDENT_TRACKING_SHEET)
    assert.ok(worksheet)
    const rows = [1, 2].map((rowNumber) =>
      (worksheet.getRow(rowNumber).values as ExcelJS.CellValue[]).slice(1)
    )

    assert.equal(Boolean(workbook.getWorksheet(STUDENT_TRACKING_SHEET)), true)
    assert.deepEqual(rows[1], STUDENT_TRACKING_HEADERS)
    assert.equal(rows.length, 2)
  })

  it('prefers Supabase storage and only falls back to local files in development', () => {
    const remote = Buffer.from('remote workbook')
    const local = Buffer.from('local workbook')

    assert.deepEqual(
      resolveStudentTrackingWorkbookSource({ remote, local, allowLocalFallback: true }),
      { buffer: remote, source: 'supabase' }
    )
    assert.deepEqual(
      resolveStudentTrackingWorkbookSource({ remote: null, local, allowLocalFallback: true }),
      { buffer: local, source: 'local' }
    )
    assert.equal(
      resolveStudentTrackingWorkbookSource({ remote: null, local, allowLocalFallback: false }),
      null
    )
  })

  it('reports validation warnings for incomplete or invalid student rows', async () => {
    const result = await parseStudentTrackingWorkbook(
      await buildWorkbook([
        ['Ignore'],
        STUDENT_TRACKING_HEADERS,
        studentRow('', '', 'Nadia', 'BadStage', 'not-a-number', 25000, 'CARD'),
      ])
    )

    assert.equal(result.students.length, 1)
    assert.equal(result.warnings.length, 5)
    assert.deepEqual(
      result.warnings.map((warning) => warning.message),
      [
        'Missing Student ID',
        'Missing Full Name',
        'Invalid Stage "BadStage"; defaulted to Inquiry',
        'Invalid Payment Amount (BDT) "not-a-number"; defaulted to 0',
        'Invalid Payment Method "CARD"',
      ]
    )
  })
})

function studentRow(
  id: string,
  name: string,
  consultant: string,
  stage: string,
  paid: number | string,
  due: number | string,
  method = 'BANK'
) {
  return [
    id,
    name,
    '',
    '',
    '',
    '',
    consultant,
    '',
    'University',
    '',
    '',
    '',
    '',
    '',
    4.5,
    '',
    '',
    '',
    stage,
    paid,
    method,
    due,
    '',
    '',
    '',
  ]
}
