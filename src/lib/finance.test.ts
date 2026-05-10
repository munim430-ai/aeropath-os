import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildFinanceDocumentNumber,
  buildFinanceSummary,
  buildStudentProfitLoss,
  toMoney,
  type FinanceExpense,
  type FinancePayment,
} from './finance'

describe('finance helpers', () => {
  it('normalizes money values', () => {
    assert.equal(toMoney('1200'), 1200)
    assert.equal(toMoney(-50), 0)
    assert.equal(toMoney('bad'), 0)
  })

  it('calculates finance summary from payments and expenses', () => {
    const payments: FinancePayment[] = [
      { student_id: 's1', payment_date: '2026-05-01', amount: 50000, method: 'BKASH', purpose: 'Service Charge' },
      { student_id: 's2', payment_date: '2026-05-02', amount: 25000, method: 'BANK', purpose: 'University Fee' },
    ]
    const expenses: FinanceExpense[] = [
      { date: '2026-05-03', amount: 10000, type: 'Out', category: 'Rent' },
      { date: '2026-05-04', amount: 5000, type: 'In', category: 'Adjustment' },
    ]

    assert.deepEqual(buildFinanceSummary(payments, expenses), {
      totalCollected: 75000,
      totalExpenses: 10000,
      totalInflows: 5000,
      netProfit: 70000,
    })
  })

  it('calculates per-student profit and loss', () => {
    const rows = buildStudentProfitLoss(
      [
        { id: 's1', full_name: 'Muniem' },
        { id: 's2', full_name: 'Ayesha' },
      ],
      [
        { student_id: 's1', payment_date: '2026-05-01', amount: 70000, method: 'CASH', purpose: 'Service Charge' },
        { student_id: 's2', payment_date: '2026-05-01', amount: 30000, method: 'BANK', purpose: 'Other' },
      ],
      [
        { student_id: 's1', date: '2026-05-02', amount: 12000, type: 'Out', category: 'Courier' },
        { student_id: 's2', date: '2026-05-02', amount: 35000, type: 'Out', category: 'Notary' },
      ]
    )

    assert.equal(rows[0].studentName, 'Muniem')
    assert.equal(rows[0].netProfit, 58000)
    assert.equal(rows[1].netProfit, -5000)
  })

  it('generates stable document numbers', () => {
    assert.equal(buildFinanceDocumentNumber('INV', new Date('2026-05-10T00:00:00Z'), 8), 'INV-20260510-0009')
  })
})
