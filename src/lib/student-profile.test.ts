import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildStudentProfileCompletion, buildStudentProfileUpdatePayload } from './student-profile'

describe('student profile expansion helpers', () => {
  it('counts academic, language, work, and visa history fields in completion', () => {
    const result = buildStudentProfileCompletion({
      full_name: 'A Student',
      email: 'student@example.com',
      phone: '123',
      date_of_birth: '2001-01-01',
      ssc_gpa: 4.8,
      ssc_passing_year: 2018,
      hsc_gpa: 4.7,
      hsc_passing_year: 2020,
      preferred_subject: 'Computer Science',
      test_type: 'IELTS',
      overall_test_score: 7,
      listening_score: 7,
      reading_score: 7,
      writing_score: 6.5,
      speaking_score: 7,
      work_experiences: [{ company_name: 'ABC', designation: 'Intern', period: '6 months', certificate_url: null }],
      visa_histories: [{ country_name: 'Canada', visa_category: 'Student', outcome: 'Rejected', year: 2024 }],
    })

    assert.equal(result.completedRequired, result.totalRequired)
    assert.equal(result.percent, 100)
  })

  it('builds a safe student portal update payload with expanded fields', () => {
    const formData = new FormData()
    formData.set('phone', ' 01900000000 ')
    formData.set('date_of_birth', '2000-05-10')
    formData.set('ssc_gpa', '4.5')
    formData.set('ssc_passing_year', '2018')
    formData.set('preferred_subject', 'Business')
    formData.set('test_type', 'PTE')
    formData.set('overall_test_score', '72')

    assert.deepEqual(buildStudentProfileUpdatePayload(formData), {
      phone: '01900000000',
      date_of_birth: '2000-05-10',
      ssc_gpa: 4.5,
      ssc_passing_year: 2018,
      preferred_subject: 'Business',
      test_type: 'PTE',
      overall_test_score: 72,
    })
  })
})
