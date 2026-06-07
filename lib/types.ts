export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  companyName?: string
  address?: string
  city?: string
  country?: string
  eventName?: string
  expectedAttendees?: number
  neededServices?: string
  comments?: string
  profilePicture?: string
  isActive: boolean
  isStaff: boolean
  isSuperAdmin: boolean
  createdAt: string
  updatedAt: string
}

export interface Abstract {
  id: number
  subThemeCategory: string
  title: string
  authorInformation: string
  presentationType: 'Oral' | 'Poster' | 'Workshop'
  presenterFullName: string
  presenterEmail: string
  presenterPhone: string
  presenterInstitution: string
  presenterCountry: string
  presenterGender: string
  professionalStatus: string
  deanContact?: string
  abstractBody: string
  submittedBy: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'more_info_requested'
  points?: number | null
  equityPoints?: number | null
  scRecommendation?: 'accept_oral' | 'accept_poster' | 'not_accepted' | null
  // Bonus point breakdown (Sections C + D)
  geoBonusUnderrepresentedRegion?: number | null
  geoBonusLMIC?: number | null
  geoBonusFirstTimeInstitution?: number | null
  equityBonusUnderrepresentedGender?: number | null
  equityBonusMemberUniversity?: number | null
  equityBonusPartnerInstitution?: number | null
  reviewNote?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
  // Score fields embedded in list responses
  myScore?: number | null // staff: their own Phase 1 totalScore for this abstract
  averageScore?: number | null // super admin: average across all Phase 1 reviews
  reviewCount?: number // super admin: number of Phase 1 reviews
  reviews?: { reviewerEmail: string; totalScore: number; recommendation: string }[]
}

export interface ScientificReviewPayload {
  relevance: number
  objectives: number
  methodology: number
  results: number
  conclusions: number
  writingQuality: number
  comment?: string
}

export interface ScientificReview extends ScientificReviewPayload {
  id: number
  abstractId: number
  reviewedBy: string
  totalScore: number
  recommendation: 'accept_oral' | 'accept_oral_minor_revisions' | 'accept_poster' | 'invite_resubmission' | 'reject'
  createdAt: string
}

export interface SCReviewItem {
  reviewerEmail: string
  scientificMeritTotal: number
  recommendation: 'accept_oral' | 'accept_poster' | 'not_accepted'
  comment?: string | null
}

export interface ReviewsSummary {
  reviews: ScientificReview[]
  averageScientificMerit: number
  reviewCount: number
  meetsMinimumThreshold: boolean
  scReviews?: SCReviewItem[]
  scAverageScore?: number | null
  scReviewCount?: number
}

export interface SCScorePayload {
  titleClarity: number
  structuredFormat: number
  relevance: number
  methodology: number
  dataQuality: number
  conclusions: number
  originality: number
  contribution: number
  overallMerit: number
  comment?: string
}

export interface BonusPointsPayload {
  geoBonusUnderrepresentedRegion: number
  geoBonusLMIC: number
  geoBonusFirstTimeInstitution: number
  equityBonusUnderrepresentedGender: number
  equityBonusMemberUniversity: number
  equityBonusPartnerInstitution: number
  note?: string
}

export interface AbstractComment {
  id: number
  abstractId: number
  comment: string
  submittedBy: string
  createdAt: string
  updatedAt: string
  abstract?: Abstract
}

export interface AbstractCoauthor {
  id: number
  abstractId: number
  userEmail: string
  invitedBy: string
  createdAt: string
}

export interface AuthResponse {
  message: string
  data: {
    user: User
    token: string
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiResponse<T> {
  message: string
  data: T
  pagination?: Pagination
}

export interface ErrorResponse {
  message: string | string[]
  error: string
  statusCode: number
}

export interface AbstractHistory {
  id: number
  abstractId: number
  changedBy: string
  changeType: 'created' | 'updated' | 'status_changed'
  previousValues: Record<string, any> | null
  newValues: Record<string, any> | null
  createdAt: string
}

export interface ChangelogEntry {
  changedBy: string
  changeType: string
  changedAt: string
  fieldChanges: Array<{
    field: string
    oldValue: any
    newValue: any
  }>
}

export interface Changelog {
  currentVersion: Abstract
  changes: ChangelogEntry[]
}

export interface StaffTopicAssignment {
  id: number
  userId: number
  topic: string
  createdAt: string
  updatedAt: string
}

export interface StaffMember extends User {
  topicAssignments: StaffTopicAssignment[]
}
