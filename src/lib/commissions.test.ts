import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCommissionSummary,
  calculateSubAgentPayout,
  calculateUniversityCommission,
} from './commissions'

describe('commission helpers', () => {
  it('calculates expected university commission from tuition and rate', () => {
    assert.equal(calculateUniversityCommission(12000, 10), 1200)
    assert.equal(calculateUniversityCommission('9000', '12.5'), 1125)
  })

  it('calculates sub-agent payout from received commission and rate', () => {
    assert.equal(calculateSubAgentPayout(2000, 15), 300)
    assert.equal(calculateSubAgentPayout(-100, 10), 0)
  })

  it('builds status totals for commission and payout tracking', () => {
    const summary = buildCommissionSummary([
      { university_amount: 1000, sub_agent_amount: 100, status: 'Pending' },
      { university_amount: 2500, sub_agent_amount: 250, status: 'Received' },
      { university_amount: 800, sub_agent_amount: 80, status: 'Paid' },
      { university_amount: 300, sub_agent_amount: 30, status: 'Cancelled' },
    ])

    assert.deepEqual(summary, {
      expectedUniversityCommission: 4300,
      pendingCommission: 1000,
      receivedCommission: 3300,
      subAgentPayoutDue: 350,
      paidSubAgentPayout: 80,
      cancelledCommission: 300,
    })
  })
})
