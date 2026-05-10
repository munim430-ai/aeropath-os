import type { WebsiteContentData } from '@/lib/types'

export const emptyWebsiteContent: WebsiteContentData = {
  site: {
    hero: {
      headline: '',
      subheadline: '',
      cta_label: '',
      cta_url: '',
      background_image_url: '',
    },
    about: {
      heading: '',
      body: '',
      image_url: '',
    },
    contact: {
      phone: '',
      email: '',
      address: '',
      whatsapp: '',
    },
    seo: {
      title: '',
      description: '',
      og_image_url: '',
    },
  },
  mediaLibrary: [],
  photos: [],
  testimonials: [],
  staff: [],
  programmes: [],
  universities: [],
  faqs: [],
  blogPosts: [],
}

export function normalizeWebsiteContent(value: unknown): WebsiteContentData {
  const content = isRecord(value) ? value : {}
  const site = isRecord(content.site) ? content.site : {}

  return {
    site: {
      hero: {
        headline: getString(getRecord(site.hero).headline),
        subheadline: getString(getRecord(site.hero).subheadline),
        cta_label: getString(getRecord(site.hero).cta_label),
        cta_url: getString(getRecord(site.hero).cta_url),
        background_image_url: getString(getRecord(site.hero).background_image_url),
      },
      about: {
        heading: getString(getRecord(site.about).heading),
        body: getString(getRecord(site.about).body),
        image_url: getString(getRecord(site.about).image_url),
      },
      contact: {
        phone: getString(getRecord(site.contact).phone),
        email: getString(getRecord(site.contact).email),
        address: getString(getRecord(site.contact).address),
        whatsapp: getString(getRecord(site.contact).whatsapp),
      },
      seo: {
        title: getString(getRecord(site.seo).title),
        description: getString(getRecord(site.seo).description),
        og_image_url: getString(getRecord(site.seo).og_image_url),
      },
    },
    mediaLibrary: Array.isArray(content.mediaLibrary) ? content.mediaLibrary : [],
    photos: Array.isArray(content.photos) ? content.photos : [],
    testimonials: Array.isArray(content.testimonials) ? content.testimonials : [],
    staff: Array.isArray(content.staff) ? content.staff : [],
    programmes: Array.isArray(content.programmes) ? content.programmes : [],
    universities: Array.isArray(content.universities) ? content.universities : [],
    faqs: Array.isArray(content.faqs) ? content.faqs : [],
    blogPosts: Array.isArray(content.blogPosts) ? content.blogPosts : [],
  } as WebsiteContentData
}

export function getWebsiteContentHealth(content: WebsiteContentData) {
  const issues = [
    content.site.hero.headline.trim() ? null : 'Hero headline is missing',
    content.site.hero.subheadline.trim() ? null : 'Hero subheadline is missing',
    content.site.contact.email.trim() || content.site.contact.phone.trim() ? null : 'Contact email or phone is missing',
    content.site.seo.title.trim() ? null : 'SEO title is missing',
    content.site.seo.description.trim() ? null : 'SEO description is missing',
  ].filter(Boolean) as string[]

  return {
    issues,
    totalIssues: issues.length,
  }
}

export function createContentId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getRecord(value: unknown) {
  return isRecord(value) ? value : {}
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : ''
}
