export type UserRole = 'SuperAdmin' | 'Owner' | 'Consultant' | 'Student'

export type ApplicationStage =
  | 'Lead'
  | 'Docs'
  | 'Applied'
  | 'Visa'
  | 'Enrolled'

export type TaskStatus = 'Pending' | 'Completed'

export type DocumentType = 'Passport' | 'Transcript' | 'IELTS' | 'CV' | 'Other'

export type FinancialStatus = 'Pending' | 'Received' | 'Cancelled'

export interface Agency {
  id: string
  name: string
  subdomain: string
  logo_url: string | null
  primary_color: string
  website: string | null
  created_at: string
}

export interface User {
  id: string
  agency_id: string
  role: UserRole
  email: string
  auth_id: string
  full_name: string | null
  created_at: string
}

export interface StudentProfile {
  id: string
  agency_id: string
  user_id: string | null
  full_name: string
  phone: string | null
  degree_level: string | null
  gpa: number | null
  ielts_score: number | null
  email: string | null
  nationality: string | null
  whatsapp_number: string | null
  preferred_country: string | null
  preferred_intake: string | null
  created_at: string
}

export interface DocumentVault {
  id: string
  agency_id: string
  student_id: string
  type: DocumentType
  file_url: string
  file_name: string
  ai_parsed_data: Record<string, unknown> | null
  created_at: string
}

export interface PartnerUniversity {
  id: string
  agency_id: string | null
  name: string
  country: string | null
  requirements: {
    min_gpa?: number
    min_ielts?: number
    degree_levels?: string[]
    [key: string]: unknown
  }
  commission_rate: number
  created_at: string
}

export interface ApplicationPipeline {
  id: string
  agency_id: string
  student_id: string
  university_id: string
  stage: ApplicationStage
  notes: string | null
  intake: string | null
  scholarship_amount: number | null
  created_at: string
  updated_at: string
  student?: StudentProfile
  university?: PartnerUniversity
}

export interface TaskDispatcher {
  id: string
  agency_id: string
  assigned_to_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  created_at: string
  assigned_to?: User
}

export interface FinancialLedger {
  id: string
  agency_id: string
  pipeline_id: string
  expected_commission: number
  status: FinancialStatus
  notes: string | null
  created_at: string
  pipeline?: ApplicationPipeline
}

export interface TenantContext {
  agency: Agency
  user: User
}

export interface AIExtractedData {
  gpa?: number
  ielts_score?: number
  dob?: string
  name?: string
  degree?: string
  institution?: string
  passport_number?: string
  [key: string]: unknown
}

export interface EligibilityResult {
  university: PartnerUniversity
  eligible: boolean
  reasons: string[]
}

export interface WebsitePhoto {
  id: string
  image_url: string
  alt: string
  caption: string
}

export interface WebsiteTestimonial {
  id: string
  name: string
  role: string
  quote: string
  image_url: string
}

export interface WebsiteStaffMember {
  id: string
  name: string
  role: string
  bio: string
  image_url: string
}

export interface WebsiteProgramme {
  id: string
  title: string
  country: string
  duration: string
  description: string
}

export interface WebsiteUniversity {
  id: string
  name: string
  country: string
  logo_url: string
  description: string
}

export interface WebsiteFAQ {
  id: string
  question: string
  answer: string
}

export interface WebsiteContentData {
  photos: WebsitePhoto[]
  testimonials: WebsiteTestimonial[]
  staff: WebsiteStaffMember[]
  programmes: WebsiteProgramme[]
  universities: WebsiteUniversity[]
  faqs: WebsiteFAQ[]
}

export interface WebsiteContent {
  id: string
  agency_id: string
  content: WebsiteContentData
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}
