import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculatePerformance, getAttendanceLabel, getEmployeeDisplayName, percentage } from './hrm'

describe('hrm helpers', () => {
  it('uses full name when available and falls back to email', () => {
    assert.equal(getEmployeeDisplayName({ full_name: 'Demo Owner', email: 'owner@example.com' }), 'Demo Owner')
    assert.equal(getEmployeeDisplayName({ full_name: '', email: 'owner@example.com' }), 'owner@example.com')
  })

  it('describes attendance state', () => {
    assert.equal(getAttendanceLabel(null), 'Not clocked in')
    assert.equal(getAttendanceLabel({ clock_in_at: '2026-05-10T09:00:00Z', clock_out_at: null, status: 'Present' }), 'Clocked in')
    assert.equal(getAttendanceLabel({ clock_in_at: '2026-05-10T09:00:00Z', clock_out_at: '2026-05-10T17:00:00Z', status: 'Present' }), 'Clocked out')
  })

  it('calculates percentages safely', () => {
    assert.equal(percentage(2, 4), 50)
    assert.equal(percentage(2, 0), 0)
    assert.equal(percentage(-2, 4), 0)
  })

  it('calculates performance rows', () => {
    const [row] = calculatePerformance([
      {
        userId: 'u1',
        leadsAssigned: 10,
        leadsConverted: 4,
        tasksAssigned: 5,
        tasksCompleted: 3,
        visaOrEnrolledFiles: 2,
      },
    ])

    assert.equal(row.conversionRate, 40)
    assert.equal(row.taskCompletionRate, 60)
    assert.equal(row.visaOrEnrolledFiles, 2)
  })
})
