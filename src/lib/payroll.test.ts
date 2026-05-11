import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildPayrollSheet,
  calculatePayrollRecord,
  normalizePayrollMonth,
} from './payroll'

describe('payroll helpers', () => {
  it('calculates deductions and net salary from attendance counts', () => {
    const record = calculatePayrollRecord({
      userId: 'u1',
      baseSalary: 30000,
      incentives: 2500,
      lateDays: 2,
      absentDays: 1,
      lateDeduction: 500,
      absentDeduction: 1000,
    })

    assert.deepEqual(record, {
      user_id: 'u1',
      base_salary: 30000,
      incentives: 2500,
      deductions: 2000,
      net_salary: 30500,
    })
  })

  it('builds a salary sheet for active staff from attendance', () => {
    const rows = buildPayrollSheet({
      users: [
        { id: 'u1', full_name: 'Owner', email: 'owner@example.com', role: 'Owner' },
        { id: 'u2', full_name: 'Counselor', email: 'c@example.com', role: 'Counselor' },
        { id: 'u3', full_name: 'Student', email: 's@example.com', role: 'Student' },
      ],
      attendance: [
        { user_id: 'u1', status: 'Late' },
        { user_id: 'u1', status: 'Absent' },
        { user_id: 'u2', status: 'Present' },
      ],
      defaultBaseSalary: 20000,
      lateDeduction: 300,
      absentDeduction: 900,
    })

    assert.deepEqual(rows, [
      {
        user_id: 'u1',
        employee_name: 'Owner',
        role: 'Owner',
        base_salary: 20000,
        incentives: 0,
        deductions: 1200,
        net_salary: 18800,
        attendance: { present: 0, late: 1, absent: 1, leave: 0 },
      },
      {
        user_id: 'u2',
        employee_name: 'Counselor',
        role: 'Counselor',
        base_salary: 20000,
        incentives: 0,
        deductions: 0,
        net_salary: 20000,
        attendance: { present: 1, late: 0, absent: 0, leave: 0 },
      },
    ])
  })

  it('normalizes payroll month to the first day of the month', () => {
    assert.equal(normalizePayrollMonth('2026-05-12'), '2026-05-01')
    assert.equal(normalizePayrollMonth('bad-date'), new Date().toISOString().slice(0, 7) + '-01')
  })
})
