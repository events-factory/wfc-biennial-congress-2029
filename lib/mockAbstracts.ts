import type { Abstract } from './types'

// ---------------------------------------------------------------------------
// TEMPORARY MOCK ABSTRACT DATA
//
// The abstract backend (api.eventsfactory.rw/api/abstract) scopes abstracts by
// account/tenant, and currently returns the *previous* event's abstracts. Until
// the WFC 2029 event is provisioned there (its own tenant / API URL / account),
// the abstract layer serves this in-memory mock instead of the live backend.
//
// Toggle off later by setting NEXT_PUBLIC_USE_MOCK_ABSTRACTS=false in .env.local
// (see USE_MOCK_ABSTRACTS in lib/api.ts).
// ---------------------------------------------------------------------------

const now = '2026-06-01T09:00:00Z'

// Mutable in-memory store so create/update/delete behave during a session.
// Resets on reload — fine for a placeholder.
export const mockAbstracts: Abstract[] = [
  {
    id: 9001,
    subThemeCategory: 'Musculoskeletal Health & Prevention',
    title: 'Sit Less, Live More: A Workplace Posture Intervention in Kigali Offices',
    authorInformation: 'N. Kanyabutembo; C. Manzi',
    presentationType: 'Oral',
    presenterFullName: 'Dr. Noëlla Kanyabutembo',
    presenterEmail: 'noella@example.rw',
    presenterPhone: '+250780000001',
    presenterInstitution: 'Rwanda Chiropractic Association',
    presenterCountry: 'Rwanda',
    presenterGender: 'Female',
    professionalStatus: 'Chiropractor',
    abstractBody:
      'A six-month workplace intervention promoting movement breaks and posture correction reduced reported lower-back pain among office workers. Methods, outcomes, and implications for preventive musculoskeletal care are discussed.',
    submittedBy: 'noella@example.rw',
    status: 'approved',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 9002,
    subThemeCategory: 'Spine Care & Rehabilitation',
    title: 'Integrating Chiropractic into Primary Healthcare Pathways in East Africa',
    authorInformation: 'K. Habimana',
    presentationType: 'Oral',
    presenterFullName: 'Dr. Kevin Habimana',
    presenterEmail: 'kevin@example.rw',
    presenterPhone: '+250780000002',
    presenterInstitution: 'University of Rwanda',
    presenterCountry: 'Rwanda',
    presenterGender: 'Male',
    professionalStatus: 'Researcher',
    abstractBody:
      'This study evaluates referral pathways and integration models for chiropractic services within public primary care, highlighting access, cost, and patient outcome considerations.',
    submittedBy: 'kevin@example.rw',
    status: 'under_review',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 9003,
    subThemeCategory: 'Public Health & Policy',
    title: 'Prevalence of Low-Back Pain Among Commercial Drivers in Kigali',
    authorInformation: 'A. Uwase; J. Niyonzima',
    presentationType: 'Poster',
    presenterFullName: 'Alice Uwase',
    presenterEmail: 'alice@example.rw',
    presenterPhone: '+250780000003',
    presenterInstitution: 'Kigali Health Institute',
    presenterCountry: 'Rwanda',
    presenterGender: 'Female',
    professionalStatus: 'Student',
    abstractBody:
      'A cross-sectional survey of 420 commercial drivers found a high prevalence of chronic low-back pain associated with prolonged sitting and vehicle vibration exposure.',
    submittedBy: 'alice@example.rw',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 9004,
    subThemeCategory: 'Education & Workforce Development',
    title: 'Building a Chiropractic Training Curriculum for the African Context',
    authorInformation: 'T. Okello',
    presentationType: 'Workshop',
    presenterFullName: 'Dr. Thomas Okello',
    presenterEmail: 'thomas@example.ug',
    presenterPhone: '+256700000004',
    presenterInstitution: 'Makerere University',
    presenterCountry: 'Uganda',
    presenterGender: 'Male',
    professionalStatus: 'Educator',
    abstractBody:
      'A proposed competency-based curriculum framework for training chiropractors in low-resource settings, with emphasis on prevention and interprofessional collaboration.',
    submittedBy: 'thomas@example.ug',
    status: 'more_info_requested',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 9005,
    subThemeCategory: 'Spine Care & Rehabilitation',
    title: 'Manual Therapy Outcomes in Post-Stroke Shoulder Pain: A Pilot Study',
    authorInformation: 'S. Mukamana',
    presentationType: 'Poster',
    presenterFullName: 'Dr. Sandrine Mukamana',
    presenterEmail: 'sandrine@example.rw',
    presenterPhone: '+250780000005',
    presenterInstitution: 'CHUK Teaching Hospital',
    presenterCountry: 'Rwanda',
    presenterGender: 'Female',
    professionalStatus: 'Physiotherapist',
    abstractBody:
      'A pilot evaluating manual therapy adjuncts for hemiplegic shoulder pain showed promising reductions in pain scores over eight weeks.',
    submittedBy: 'sandrine@example.rw',
    status: 'rejected',
    createdAt: now,
    updatedAt: now,
  },
]

export function nextMockId(): number {
  return mockAbstracts.reduce((max, a) => Math.max(max, a.id), 9000) + 1
}

export function mockStatusCounts() {
  const count = (s: Abstract['status']) =>
    mockAbstracts.filter((a) => a.status === s).length
  return {
    all: mockAbstracts.length,
    pending: count('pending'),
    under_review: count('under_review'),
    approved: count('approved'),
    rejected: count('rejected'),
    more_info_requested: count('more_info_requested'),
  }
}
