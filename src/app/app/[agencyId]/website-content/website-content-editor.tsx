'use client'

import * as React from 'react'
import { CheckCircle2, ExternalLink, Image, Info, Plus, Save, Send, Trash2, UserRound } from 'lucide-react'
import { saveWebsiteContent } from '@/app/actions/website-content'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { createContentId, normalizeWebsiteContent } from '@/lib/website-content'
import type {
  WebsiteContent,
  WebsiteContentData,
  WebsiteBlogPost,
  WebsiteFAQ,
  WebsitePhoto,
  WebsiteProgramme,
  WebsiteStaffMember,
  WebsiteTestimonial,
  WebsiteUniversity,
} from '@/lib/types'

type SectionKey = keyof WebsiteContentData

const sectionMeta: Record<SectionKey, {
  anchor: string
  description: string
  imageLabel?: string
  label: string
  placement: string
}> = {
  photos: {
    anchor: 'engagement',
    description: 'Upload images for the gallery/event area on the public website.',
    imageLabel: 'Gallery / engagement image',
    label: 'Photos',
    placement: 'Website gallery / engagement section',
  },
  testimonials: {
    anchor: 'stories',
    description: 'Student testimonials become success story cards on the website.',
    imageLabel: 'Success story card image',
    label: 'Testimonials',
    placement: 'Success Stories section',
  },
  staff: {
    anchor: 'team',
    description: 'Team members appear in the public team grid.',
    imageLabel: 'Team member photo',
    label: 'Staff',
    placement: 'Our Team section',
  },
  programmes: {
    anchor: 'programmes',
    description: 'Programmes appear as course/pathway cards before the main service content.',
    label: 'Programmes',
    placement: 'Featured Programmes section',
  },
  universities: {
    anchor: 'universities',
    description: 'Universities appear as partner/featured university cards.',
    imageLabel: 'University logo',
    label: 'Universities',
    placement: 'Partner Universities section',
  },
  blogPosts: {
    anchor: 'blog',
    description: 'Blog posts replace the Field Notes cards on the website.',
    imageLabel: 'Blog card image',
    label: 'Blog Posts',
    placement: 'Blog / Field Notes section',
  },
  faqs: {
    anchor: 'faq',
    description: 'FAQs appear near the bottom of the website before the contact section.',
    label: 'FAQ',
    placement: 'FAQ section',
  },
}

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: 'photos', label: sectionMeta.photos.label },
  { key: 'testimonials', label: sectionMeta.testimonials.label },
  { key: 'staff', label: sectionMeta.staff.label },
  { key: 'programmes', label: sectionMeta.programmes.label },
  { key: 'universities', label: sectionMeta.universities.label },
  { key: 'blogPosts', label: sectionMeta.blogPosts.label },
  { key: 'faqs', label: sectionMeta.faqs.label },
]

interface WebsiteContentEditorProps {
  agencyId: string
  initialContent: WebsiteContent
  websiteUrl: string | null
}

export function WebsiteContentEditor({ agencyId, initialContent, websiteUrl }: WebsiteContentEditorProps) {
  const [activeSection, setActiveSection] = React.useState<SectionKey>('photos')
  const [content, setContent] = React.useState<WebsiteContentData>(
    normalizeWebsiteContent(initialContent.content)
  )
  const [isPublished, setIsPublished] = React.useState(initialContent.is_published)
  const [loading, setLoading] = React.useState<'draft' | 'publish' | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function persist(publish: boolean) {
    setLoading(publish ? 'publish' : 'draft')
    setMessage(null)
    setError(null)

    const result = await saveWebsiteContent(agencyId, content, publish)

    if (result?.error) {
      setError(result.error)
    } else {
      setIsPublished(publish)
      setMessage(publish ? 'Published content is live for the website API.' : 'Draft saved.')
    }

    setLoading(null)
  }

  function addItem(section: SectionKey) {
    setContent((current) => ({
      ...current,
      [section]: [...current[section], createEmptyItem(section)],
    }))
  }

  function updateItem<T extends { id: string }>(
    section: SectionKey,
    id: string,
    patch: Partial<T>
  ) {
    setContent((current) => ({
      ...current,
      [section]: current[section].map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }))
  }

  function removeItem(section: SectionKey, id: string) {
    setContent((current) => ({
      ...current,
      [section]: current[section].filter((item) => item.id !== id),
    }))
  }

  const currentCount = content[activeSection].length
  const activeMeta = sectionMeta[activeSection]
  const previewUrl = getPreviewUrl(websiteUrl, activeMeta.anchor)

  return (
    <div className="grid gap-5 xl:grid-cols-[220px_1fr]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={cn(
                'flex h-9 w-full items-center justify-between rounded-[var(--radius-md)] px-3 text-sm transition-colors',
                activeSection === section.key
                  ? 'bg-[var(--tenant-primary)]/10 text-[#F5F5F5]'
                  : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]'
              )}
            >
              <span>{section.label}</span>
              <span className="text-xs text-[#606060]">{content[section.key].length}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <CardTitle>{activeMeta.label}</CardTitle>
              <p className="text-xs text-[#606060] mt-1">
                {currentCount} {currentCount === 1 ? 'item' : 'items'} in this section
              </p>
            </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild type="button" variant="secondary" size="sm">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Preview Section
                  </a>
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addItem(activeSection)}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
            <SectionGuide meta={activeMeta} />
          </CardHeader>
          <CardContent>
            {currentCount === 0 ? (
              <EmptySection section={activeSection} onAdd={() => addItem(activeSection)} />
            ) : (
              <div className="space-y-3">
                {renderSection(content, activeSection, updateItem, removeItem)}
              </div>
            )}
          </CardContent>
        </Card>

        {(message || error) && (
          <p
            className={cn(
              'rounded-[6px] border px-3 py-2 text-xs',
              error
                ? 'border-red-500/20 bg-red-500/10 text-red-400'
                : 'border-green-500/20 bg-green-500/10 text-[#10b981]'
            )}
          >
            {error || message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[#1E1E1E] bg-[#111111] p-4">
          <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
            <CheckCircle2 className={cn('h-4 w-4', isPublished ? 'text-[#10b981]' : 'text-[#606060]')} />
            {isPublished ? 'Published to website API' : 'Not published yet'}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              loading={loading === 'draft'}
              onClick={() => persist(false)}
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button type="button" loading={loading === 'publish'} onClick={() => persist(true)}>
              <Send className="h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function renderSection(
  content: WebsiteContentData,
  section: SectionKey,
  updateItem: <T extends { id: string }>(section: SectionKey, id: string, patch: Partial<T>) => void,
  removeItem: (section: SectionKey, id: string) => void
) {
  switch (section) {
    case 'photos':
      return content.photos.map((item) => (
        <ContentPanel key={item.id} title={item.caption || 'Photo'} onDelete={() => removeItem(section, item.id)}>
          <ImageUploadField section={section} itemId={item.id} label={sectionMeta[section].imageLabel || 'Image'} value={item.image_url} onChange={(image_url) => updateItem<WebsitePhoto>(section, item.id, { image_url })} />
          <Input label="Alt Text" value={item.alt} onChange={(event) => updateItem<WebsitePhoto>(section, item.id, { alt: event.target.value })} />
          <Input label="Caption" value={item.caption} onChange={(event) => updateItem<WebsitePhoto>(section, item.id, { caption: event.target.value })} />
        </ContentPanel>
      ))
    case 'testimonials':
      return content.testimonials.map((item) => (
        <ContentPanel key={item.id} title={item.name || 'Testimonial'} onDelete={() => removeItem(section, item.id)}>
          <Input label="Name" value={item.name} onChange={(event) => updateItem<WebsiteTestimonial>(section, item.id, { name: event.target.value })} />
          <Input label="Role / Result" value={item.role} onChange={(event) => updateItem<WebsiteTestimonial>(section, item.id, { role: event.target.value })} />
          <ImageUploadField section={section} itemId={item.id} label={sectionMeta[section].imageLabel || 'Image'} value={item.image_url} onChange={(image_url) => updateItem<WebsiteTestimonial>(section, item.id, { image_url })} />
          <Textarea label="Quote" value={item.quote} onChange={(event) => updateItem<WebsiteTestimonial>(section, item.id, { quote: event.target.value })} />
        </ContentPanel>
      ))
    case 'staff':
      return content.staff.map((item) => (
        <ContentPanel key={item.id} title={item.name || 'Staff Member'} onDelete={() => removeItem(section, item.id)}>
          <Input label="Name" value={item.name} onChange={(event) => updateItem<WebsiteStaffMember>(section, item.id, { name: event.target.value })} />
          <Input label="Role" value={item.role} onChange={(event) => updateItem<WebsiteStaffMember>(section, item.id, { role: event.target.value })} />
          <ImageUploadField section={section} itemId={item.id} label={sectionMeta[section].imageLabel || 'Image'} value={item.image_url} onChange={(image_url) => updateItem<WebsiteStaffMember>(section, item.id, { image_url })} />
          <Textarea label="Bio" value={item.bio} onChange={(event) => updateItem<WebsiteStaffMember>(section, item.id, { bio: event.target.value })} />
        </ContentPanel>
      ))
    case 'programmes':
      return content.programmes.map((item) => (
        <ContentPanel key={item.id} title={item.title || 'Programme'} onDelete={() => removeItem(section, item.id)}>
          <Input label="Title" value={item.title} onChange={(event) => updateItem<WebsiteProgramme>(section, item.id, { title: event.target.value })} />
          <Input label="Country" value={item.country} onChange={(event) => updateItem<WebsiteProgramme>(section, item.id, { country: event.target.value })} />
          <Input label="Duration" value={item.duration} onChange={(event) => updateItem<WebsiteProgramme>(section, item.id, { duration: event.target.value })} />
          <Textarea label="Description" value={item.description} onChange={(event) => updateItem<WebsiteProgramme>(section, item.id, { description: event.target.value })} />
        </ContentPanel>
      ))
    case 'universities':
      return content.universities.map((item) => (
        <ContentPanel key={item.id} title={item.name || 'University'} onDelete={() => removeItem(section, item.id)}>
          <Input label="Name" value={item.name} onChange={(event) => updateItem<WebsiteUniversity>(section, item.id, { name: event.target.value })} />
          <Input label="Country" value={item.country} onChange={(event) => updateItem<WebsiteUniversity>(section, item.id, { country: event.target.value })} />
          <ImageUploadField section={section} itemId={item.id} label={sectionMeta[section].imageLabel || 'Logo'} value={item.logo_url} onChange={(logo_url) => updateItem<WebsiteUniversity>(section, item.id, { logo_url })} />
          <Textarea label="Description" value={item.description} onChange={(event) => updateItem<WebsiteUniversity>(section, item.id, { description: event.target.value })} />
        </ContentPanel>
      ))
    case 'faqs':
      return content.faqs.map((item) => (
        <ContentPanel key={item.id} title={item.question || 'FAQ'} onDelete={() => removeItem(section, item.id)}>
          <Input label="Question" value={item.question} onChange={(event) => updateItem<WebsiteFAQ>(section, item.id, { question: event.target.value })} />
          <Textarea label="Answer" value={item.answer} onChange={(event) => updateItem<WebsiteFAQ>(section, item.id, { answer: event.target.value })} />
        </ContentPanel>
      ))
    case 'blogPosts':
      return content.blogPosts.map((item) => (
        <ContentPanel key={item.id} title={item.title || 'Blog Post'} onDelete={() => removeItem(section, item.id)}>
          <Input label="Title" value={item.title} onChange={(event) => updateItem<WebsiteBlogPost>(section, item.id, { title: event.target.value })} />
          <Input label="Tag" value={item.tag} placeholder="Visa Guide" onChange={(event) => updateItem<WebsiteBlogPost>(section, item.id, { tag: event.target.value })} />
          <Input label="Date" value={item.date} placeholder="May 09, 2026" onChange={(event) => updateItem<WebsiteBlogPost>(section, item.id, { date: event.target.value })} />
          <Input label="Read Time" value={item.read_time} placeholder="5 min" onChange={(event) => updateItem<WebsiteBlogPost>(section, item.id, { read_time: event.target.value })} />
          <ImageUploadField section={section} itemId={item.id} label={sectionMeta[section].imageLabel || 'Image'} value={item.image_url} onChange={(image_url) => updateItem<WebsiteBlogPost>(section, item.id, { image_url })} />
          <Input label="Post URL" value={item.url} placeholder="#" onChange={(event) => updateItem<WebsiteBlogPost>(section, item.id, { url: event.target.value })} />
          <Textarea label="Excerpt" value={item.excerpt} onChange={(event) => updateItem<WebsiteBlogPost>(section, item.id, { excerpt: event.target.value })} />
        </ContentPanel>
      ))
  }
}

function SectionGuide({ meta }: { meta: (typeof sectionMeta)[SectionKey] }) {
  return (
    <div className="rounded-[8px] border border-[var(--tenant-primary)]/20 bg-[var(--tenant-primary)]/10 p-3">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tenant-primary)]" />
        <div>
          <p className="text-xs font-medium text-[#F5F5F5]">Appears on website: {meta.placement}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#A0A0A0]">{meta.description}</p>
        </div>
      </div>
    </div>
  )
}

function ContentPanel({
  children,
  title,
  onDelete,
}: {
  children: React.ReactNode
  title: string
  onDelete: () => void
}) {
  return (
    <div className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium text-[#F5F5F5]">{title}</p>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} title="Delete item">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  )
}

function getPreviewUrl(websiteUrl: string | null, anchor: string) {
  const fallback = 'https://eduflex-v2.vercel.app'
  const baseUrl = websiteUrl?.trim() || fallback
  const normalized = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

  return `${normalized.replace(/\/$/, '')}/#${anchor}`
}

function ImageUploadField({
  itemId,
  label,
  onChange,
  section,
  value,
}: {
  itemId: string
  label: string
  onChange: (value: string) => void
  section: SectionKey
  value: string
}) {
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const inputId = `${section}-${itemId}-${label.toLowerCase()}`
  const supabase = React.useMemo(() => createClient(), [])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    const extension = file.name.split('.').pop() || 'jpg'
    const safeName = file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'image'
    const path = `${window.location.pathname.split('/')[2]}/${section}/${itemId}/${Date.now()}-${safeName}.${extension}`
    const { error } = await supabase.storage.from('website-assets').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    })

    if (error) {
      setUploadError(error.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('website-assets').getPublicUrl(path)
    onChange(data.publicUrl)
    event.target.value = ''
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-1.5 md:col-span-2">
      <label htmlFor={inputId} className="text-xs font-medium text-[#A0A0A0]">
        {label}
      </label>
      <div className="grid gap-3 md:grid-cols-[128px_1fr]">
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-[8px] border border-[#2A2A2A] bg-[#111111]">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <Image className="h-7 w-7 text-[#606060]" />
          )}
        </div>
        <div className="space-y-2">
          <Input
            id={inputId}
            label="Image URL"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Upload an image or paste a URL"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[#2A2A2A] bg-[#1A1A1A] px-3 text-xs font-medium text-[#F5F5F5] transition-colors hover:bg-[#222222]">
              {uploading ? 'Uploading...' : 'Upload Image'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
                Clear
              </Button>
            )}
          </div>
          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
        </div>
      </div>
    </div>
  )
}

function EmptySection({ section, onAdd }: { section: SectionKey; onAdd: () => void }) {
  const Icon = section === 'photos' ? Image : section === 'staff' ? UserRound : Plus

  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-[8px] border border-dashed border-[#2A2A2A] bg-[#0A0A0A] px-4 text-center">
      <Icon className="h-8 w-8 text-[#606060]" />
      <p className="mt-3 text-sm font-medium text-[#F5F5F5]">No items here yet</p>
      <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add Item
      </Button>
    </div>
  )
}

function Textarea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const inputId = label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5 md:col-span-2">
      <label htmlFor={inputId} className="text-xs font-medium text-[#A0A0A0]">
        {label}
      </label>
      <textarea
        id={inputId}
        className="min-h-24 w-full rounded-[var(--radius-md)] border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-[#F5F5F5] placeholder:text-[#606060] transition-colors focus:border-[var(--tenant-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--tenant-primary)]"
        {...props}
      />
    </div>
  )
}

function createEmptyItem(section: SectionKey) {
  const id = createContentId(section)

  switch (section) {
    case 'photos':
      return { id, image_url: '', alt: '', caption: '' }
    case 'testimonials':
      return { id, name: '', role: '', quote: '', image_url: '' }
    case 'staff':
      return { id, name: '', role: '', bio: '', image_url: '' }
    case 'programmes':
      return { id, title: '', country: '', duration: '', description: '' }
    case 'universities':
      return { id, name: '', country: '', logo_url: '', description: '' }
    case 'faqs':
      return { id, question: '', answer: '' }
    case 'blogPosts':
      return { id, title: '', tag: '', date: '', read_time: '', excerpt: '', image_url: '', url: '' }
  }
}
