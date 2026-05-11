import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildSubAgentPayload,
  buildSubAgentSummary,
  normalizeSubAgentEmail,
} from './sub-agents'

describe('sub-agent helpers', () => {
  it('normalizes email and create payload values', () => {
    const formData = new FormData()
    formData.set('name', '  Dhaka Partner ')
    formData.set('contact_name', '  Partner Manager ')
    formData.set('email', ' PARTNER@EXAMPLE.COM ')
    formData.set('phone', ' +8801000000000 ')
    formData.set('commission_rate', '12.5')

    assert.deepEqual(buildSubAgentPayload(formData), {
      name: 'Dhaka Partner',
      contact_name: 'Partner Manager',
      email: 'partner@example.com',
      phone: '+8801000000000',
      status: 'Active',
      commission_rate: 12.5,
    })
    assert.equal(normalizeSubAgentEmail(' PARTNER@EXAMPLE.COM '), 'partner@example.com')
  })

  it('summarizes assigned students per sub-agent', () => {
    const summary = buildSubAgentSummary({
      subAgents: [
        { id: 's1', status: 'Active' },
        { id: 's2', status: 'Disabled' },
      ],
      students: [
        { sub_agent_id: 's1' },
        { sub_agent_id: 's1' },
        { sub_agent_id: null },
      ],
    })

    assert.deepEqual(summary, {
      totalSubAgents: 2,
      activeSubAgents: 1,
      assignedStudents: 2,
      unassignedStudents: 1,
      studentsBySubAgent: { s1: 2 },
    })
  })
})
