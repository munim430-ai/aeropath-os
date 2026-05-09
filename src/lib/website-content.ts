import type { WebsiteContentData } from '@/lib/types'

export const emptyWebsiteContent: WebsiteContentData = {
  photos: [],
  testimonials: [],
  staff: [],
  programmes: [],
  universities: [],
  faqs: [],
}

export function normalizeWebsiteContent(value: unknown): WebsiteContentData {
  const content = isRecord(value) ? value : {}

  return {
    photos: Array.isArray(content.photos) ? content.photos : [],
    testimonials: Array.isArray(content.testimonials) ? content.testimonials : [],
    staff: Array.isArray(content.staff) ? content.staff : [],
    programmes: Array.isArray(content.programmes) ? content.programmes : [],
    universities: Array.isArray(content.universities) ? content.universities : [],
    faqs: Array.isArray(content.faqs) ? content.faqs : [],
  } as WebsiteContentData
}

export function createContentId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
