export type CommissionStatus = 'Pending' | 'Received' | 'Paid' | 'Cancelled'

export type CommissionPayoutLite = {
  university_amount: number | string | null
  sub_agent_amount: number | string | null
  status: CommissionStatus
}

export function toCommissionAmount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function calculateUniversityCommission(tuitionAmount: unknown, commissionRate: unknown): number {
  return roundMoney(toCommissionAmount(tuitionAmount) * (toCommissionAmount(commissionRate) / 100))
}

export function calculateSubAgentPayout(receivedCommission: unknown, payoutRate: unknown): number {
  return roundMoney(toCommissionAmount(receivedCommission) * (toCommissionAmount(payoutRate) / 100))
}

export function buildCommissionSummary(rows: CommissionPayoutLite[]) {
  const activeRows = rows.filter((row) => row.status !== 'Cancelled')
  const receivedRows = rows.filter((row) => row.status === 'Received' || row.status === 'Paid')

  return {
    expectedUniversityCommission: sum(activeRows, 'university_amount'),
    pendingCommission: sum(rows.filter((row) => row.status === 'Pending'), 'university_amount'),
    receivedCommission: sum(receivedRows, 'university_amount'),
    subAgentPayoutDue: sum(rows.filter((row) => row.status === 'Pending' || row.status === 'Received'), 'sub_agent_amount'),
    paidSubAgentPayout: sum(rows.filter((row) => row.status === 'Paid'), 'sub_agent_amount'),
    cancelledCommission: sum(rows.filter((row) => row.status === 'Cancelled'), 'university_amount'),
  }
}

export function buildCommissionPayload(formData: FormData) {
  const payoutDate = normalizeText(formData.get('payout_date'))
  const subAgentId = normalizeText(formData.get('sub_agent_id'))

  return {
    pipeline_id: normalizeText(formData.get('pipeline_id')),
    sub_agent_id: subAgentId === 'none' ? null : subAgentId,
    university_amount: toCommissionAmount(formData.get('university_amount')),
    sub_agent_amount: toCommissionAmount(formData.get('sub_agent_amount')),
    status: normalizeStatus(formData.get('status')),
    payout_date: payoutDate,
    notes: normalizeText(formData.get('notes')),
  }
}

function sum(rows: CommissionPayoutLite[], key: 'university_amount' | 'sub_agent_amount') {
  return roundMoney(rows.reduce((total, row) => total + toCommissionAmount(row[key]), 0))
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function normalizeText(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function normalizeStatus(value: FormDataEntryValue | null): CommissionStatus {
  return value === 'Received' || value === 'Paid' || value === 'Cancelled' ? value : 'Pending'
}
