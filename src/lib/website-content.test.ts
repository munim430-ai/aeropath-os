import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeWebsiteContent, getWebsiteContentHealth } from './website-content'

test('normalizeWebsiteContent includes site settings and media library defaults', () => {
  const content = normalizeWebsiteContent(null)

  assert.deepEqual(content.site.hero, {
    headline: '',
    subheadline: '',
    cta_label: '',
    cta_url: '',
    background_image_url: '',
  })
  assert.deepEqual(content.site.seo, {
    title: '',
    description: '',
    og_image_url: '',
  })
  assert.deepEqual(content.mediaLibrary, [])
})

test('normalizeWebsiteContent preserves supported CMS site fields', () => {
  const content = normalizeWebsiteContent({
    site: {
      hero: { headline: 'Study Abroad', cta_label: 'Apply Now' },
      about: { heading: 'About', body: 'Agency story' },
      contact: { phone: '+8801', email: 'info@example.com' },
      seo: { title: 'EduFlex' },
    },
    mediaLibrary: [{ id: 'asset-1', url: 'https://example.com/a.jpg', alt: 'A', type: 'image' }],
  })

  assert.equal(content.site.hero.headline, 'Study Abroad')
  assert.equal(content.site.hero.cta_label, 'Apply Now')
  assert.equal(content.site.about.body, 'Agency story')
  assert.equal(content.site.contact.email, 'info@example.com')
  assert.equal(content.site.seo.title, 'EduFlex')
  assert.equal(content.mediaLibrary[0].id, 'asset-1')
})

test('getWebsiteContentHealth reports missing required CMS fields', () => {
  const content = normalizeWebsiteContent({
    site: {
      hero: { headline: 'Study Abroad' },
      seo: { title: '' },
    },
  })

  const health = getWebsiteContentHealth(content)

  assert.equal(health.totalIssues, 4)
  assert.ok(health.issues.includes('Hero subheadline is missing'))
  assert.ok(health.issues.includes('SEO title is missing'))
})
