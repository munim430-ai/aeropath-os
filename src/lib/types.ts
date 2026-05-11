export type UserRole = 'SuperAdmin' | 'Owner' | 'Manager' | 'Counselor' | 'Receptionist' | 'Consultant' | 'Student'

export type ApplicationStage =
  | 'Lead'
  | 'Docs'
  | 'Applied'
  | 'Visa'
  | 'Enrolled'

export type TaskStatus = 'Pending' | 'Completed'

export type DocumentType = 'Passport' | 'Transcript' | 'IELTS' | 'CV' | 'Other'

export type FinancialStatus = 'Pending' | 'Received' | 'Cancelled'

export type LeadSource =
  | 'Website'
  | 'Facebook'
  | 'Instagram'
  | 'YouTube'
  | 'TikTok'
  | 'Walk-in'
  | 'Referral'
  | 'Phone'
  | 'Other'

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost'

export type VisaStatus = 'Not Started' | 'Preparing' | 'Submitted' | 'Approved' | 'Rejected'

export type ChecklistItemStatus = 'Pending' | 'Completed' | 'Not Required'

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
  status?: 'Active' | 'Invited' | 'Disabled'
  created_at: string
}

export interface StudentProfile {
  id: string
  agency_id: string
  user_id: string | null
  full_name: string
  phone: string | null
  date_of_birth?: string | null
  degree_level: string | null
  gpa: number | null
  ielts_score: number | null
  email: string | null
  nationality: string | null
  whatsapp_number: string | null
  preferred_country: string | null
  preferred_intake: string | null
  ssc_gpa?: number | null
  ssc_passing_year?: number | null
  hsc_gpa?: number | null
  hsc_passing_year?: number | null
  preferred_subject?: string | null
  test_type?: 'IELTS' | 'PTE' | 'TOEFL' | 'TOPIK' | 'Other' | null
  overall_test_score?: number | null
  listening_score?: number | null
  reading_score?: number | null
  writing_score?: number | null
  speaking_score?: number | null
  created_at: string
}

export interface StudentWorkExperience {
  id: string
  agency_id: string
  student_id: string
  company_name: string
  designation: string | null
  period: string | null
  certificate_url: string | null
  created_at: string
}

export interface StudentVisaHistory {
  id: string
  agency_id: string
  student_id: string
  country_name: string
  visa_category: string | null
  outcome: 'Approved' | 'Rejected' | 'Pending' | 'Withdrawn'
  year: number | null
  created_at: string
}

export interface DocumentVault {
  id: string
  agency_id: string
  student_id: string
  type: DocumentType
  file_url: string
  file_name: string
  version_number: number
  is_current: boolean
  uploaded_by: 'student_portal' | 'staff'
  ai_parsed_data: Record<string, unknown> | null
  created_at: string
}

export interface PartnerUniversity {
  id: string
  agency_id: string | null
  name: string
  country: string | null
  ranking: number | null
  tuition_fee_min: number | null
  tuition_fee_max: number | null
  intakes: string[] | null
  application_deadline: string | null
  program_levels: string[] | null
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
  visa_status: VisaStatus | null
  deadline_date: string | null
  submitted_at: string | null
  decision_at: string | null
  notes: string | null
  intake: string | null
  scholarship_amount: number | null
  created_at: string
  updated_at: string
  student?: StudentProfile
  university?: PartnerUniversity
}

export interface ApplicationChecklist {
  id: string
  agency_id: string
  pipeline_id: string
  country: string | null
  template_key: string
  created_at: string
}

export interface ApplicationChecklistItem {
  id: string
  agency_id: string
  checklist_id: string
  pipeline_id: string
  title: string
  description: string | null
  status: ChecklistItemStatus
  is_required: boolean
  sort_order: number
  notes: string | null
  completed_at: string | null
  created_at: string
}

export interface TaskDispatcher {
  id: string
  agency_id: string
  assigned_to_id: string | null
  lead_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  created_at: string
  assigned_to?: User
}

export interface SalesLead {
  id: string
  agency_id: string
  assigned_to_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  whatsapp_number: string | null
  source: LeadSource
  status: LeadStatus
  score: number
  preferred_country: string | null
  program_level: string | null
  desired_university: string | null
  preferred_intake: string | null
  notes: string | null
  lost_reason: string | null
  converted_student_id: string | null
  converted_pipeline_id: string | null
  created_at: string
  updated_at: string
  assigned_to?: User | null
  follow_ups?: TaskDispatcher[]
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

export type RuleEligibilityStatus = 'Eligible' | 'Maybe Eligible' | 'Not Eligible'

export interface RuleEligibilityResult {
  status: RuleEligibilityStatus
  reasons: string[]
  warnings: string[]
  blockers: string[]
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

export interface WebsiteBlogPost {
  id: string
  title: string
  tag: string
  date: string
  read_time: string
  excerpt: string
  image_url: string
  url: string
}

export interface WebsiteHeroContent {
  headline: string
  subheadline: string
  cta_label: string
  cta_url: string
  background_image_url: string
}

export interface WebsiteAboutContent {
  heading: string
  body: string
  image_url: string
}

export interface WebsiteContactContent {
  phone: string
  email: string
  address: string
  whatsapp: string
}

export interface WebsiteSeoContent {
  title: string
  description: string
  og_image_url: string
}

export interface WebsiteSiteContent {
  hero: WebsiteHeroContent
  about: WebsiteAboutContent
  contact: WebsiteContactContent
  seo: WebsiteSeoContent
}

export interface WebsiteMediaAsset {
  id: string
  url: string
  alt: string
  type: string
}

export interface WebsiteContentData {
  site: WebsiteSiteContent
  mediaLibrary: WebsiteMediaAsset[]
  photos: WebsitePhoto[]
  testimonials: WebsiteTestimonial[]
  staff: WebsiteStaffMember[]
  programmes: WebsiteProgramme[]
  universities: WebsiteUniversity[]
  faqs: WebsiteFAQ[]
  blogPosts: WebsiteBlogPost[]
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
