import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCounselorConversionRows,
  buildExecutiveAnalyticsSummary,
  buildRevenueTrend,
  buildTopCountries,
} from './executive-analytics'

describe('executive analytics helpers', () => {
  it('calculates success rate from enrolled applications', () => {
    const summary = buildExecutiveAnalyticsSummary({
      applications: [
        { stage: 'Enrolled' },
        { stage: 'Visa' },
        { stage: 'Enrolled' },
        { stage: 'Applied' },
      ],
      payments: [{ amount: 1000 }, { amount: 500 }],
      expenses: [{ amount: 200, type: 'Out' }],
      leads: [{ status: 'Converted' }, { status: 'New' }],
    })

    assert.equal(summary.successRate, 50)
    assert.equal(summary.totalRevenue, 1500)
    assert.equal(summary.netRevenue, 1300)
    assert.equal(summary.conversionRate, 50)
  })

  it('builds top countries from application universities and student preferences', () => {
    const countries = buildTopCountries({
      applications: [
        { country: 'Canada' },
        { country: 'Canada' },
        { country: 'UK' },
      ],
      students: [
        { preferred_country: 'Canada' },
        { preferred_country: 'Australia' },
      ],
    })

    assert.deepEqual(countries, [
      { country: 'Canada', count: 3 },
      { country: 'Australia', count: 1 },
      { country: 'UK', count: 1 },
    ])
  })

  it('builds revenue trend grouped by month', () => {
    const trend = buildRevenueTrend({
      payments: [
        { payment_date: '2026-01-10', amount: 1000 },
        { payment_date: '2026-01-20', amount: 500 },
        { payment_date: '2026-02-01', amount: 700 },
      ],
      expenses: [
        { date: '2026-01-12', amount: 200, type: 'Out' },
        { date: '2026-02-03', amount: 100, type: 'Out' },
      ],
    })

    assert.deepEqual(trend, [
      { month: '2026-01', revenue: 1500, expenses: 200, net: 1300 },
      { month: '2026-02', revenue: 700, expenses: 100, net: 600 },
    ])
  })

  it('calculates counselor lead conversion counts', () => {
    const rows = buildCounselorConversionRows({
      leads: [
        { assigned_to_id: 'u1', status: 'Converted' },
        { assigned_to_id: 'u1', status: 'New' },
        { assigned_to_id: 'u2', status: 'Converted' },
      ],
      users: [
        { id: 'u1', name: 'Counselor One' },
        { id: 'u2', name: 'Counselor Two' },
      ],
    })

    assert.deepEqual(rows, [
      { counselorId: 'u1', counselorName: 'Counselor One', totalLeads: 2, convertedLeads: 1, conversionRate: 50 },
      { counselorId: 'u2', counselorName: 'Counselor Two', totalLeads: 1, convertedLeads: 1, conversionRate: 100 },
    ])
  })
})
