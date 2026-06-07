'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { abstractsApi } from '@/lib/api'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

// Dynamically import the RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">Loading editor...</div>,
})

const SUB_THEME_CATEGORIES = [
  { value: 'Leadership, Governance, African Ownership and Partnerships for Health Workforce and Systems Transformation', label: 'Leadership, Governance, African Ownership and Partnerships for Health Workforce and Systems Transformation' },
  { value: 'Transformative Technologies, AI, Innovation, and Simulation-based Education in Medical Education', label: 'Transformative Technologies, AI, Innovation, and Simulation-based Education in Medical Education' },
  { value: 'Towards a Healthier Africa: Maternal, Newborn, and Child Health (MNCH), Gender, Sexual & Reproductive Health, and Health Systems Strengthening', label: 'Towards a Healthier Africa: Maternal, Newborn, and Child Health (MNCH), Gender, Sexual & Reproductive Health, and Health Systems Strengthening' },
  { value: 'Learner-Centered Systems: Assessment and Accreditation', label: 'Learner-Centered Systems: Assessment and Accreditation' },
]

const PRESENTATION_TYPES = [
  { value: 'Oral', label: 'Oral Presentation' },
  { value: 'Poster', label: 'Poster Presentation' },
  { value: 'Workshop', label: 'Workshop' },
]

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
]

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland',
  'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania',
  'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
  'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia',
  'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
]

// Deadline: April 30 2026 at 23:59 CAT (UTC+2 → UTC 21:59)
const SUBMISSION_DEADLINE = new Date('2026-04-30T21:59:00Z')

function isSubmissionClosed() {
  return new Date() >= SUBMISSION_DEADLINE
}

export default function SubmitAbstractPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submissionClosed, setSubmissionClosed] = useState(isSubmissionClosed)

  const [formData, setFormData] = useState<{
    subThemeCategory: string
    title: string
    authorInformation: string
    presentationType: '' | 'Oral' | 'Poster' | 'Workshop'
    presenterFullName: string
    presenterEmail: string
    presenterPhone: string
    presenterInstitution: string
    presenterCountry: string
    presenterGender: string
    professionalStatus: string
    deanContact: string
    abstractBody: string
  }>({
    subThemeCategory: '',
    title: '',
    authorInformation: '',
    presentationType: '',
    presenterFullName: '',
    presenterEmail: '',
    presenterPhone: '',
    presenterInstitution: '',
    presenterCountry: '',
    presenterGender: '',
    professionalStatus: '',
    deanContact: '',
    abstractBody: '',
  })

  // Check if user is authenticated
  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/auth/login?role=submitter')
    }
  }, [router])

  // Auto-close at deadline
  useEffect(() => {
    if (submissionClosed) return
    const msUntilDeadline = SUBMISSION_DEADLINE.getTime() - Date.now()
    if (msUntilDeadline <= 0) {
      setSubmissionClosed(true)
      return
    }
    const timer = setTimeout(() => setSubmissionClosed(true), msUntilDeadline)
    return () => clearTimeout(timer)
  }, [submissionClosed])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAbstractBodyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, abstractBody: value }))
  }

  const countWords = (text: string) => {
    const words = text.trim().split(/\s+/).filter((word) => word.length > 0)
    return words.length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validate title word count
    const titleWords = countWords(formData.title)
    if (titleWords > 15) {
      setError('Title must be maximum 15 words')
      return
    }

    // Validate abstract body word count
    const plainText = formData.abstractBody.replace(/<[^>]*>/g, ' ').trim()
    const bodyWords = countWords(plainText)
    if (bodyWords > 300) {
      setError('Abstract body must be maximum 300 words')
      return
    }

    // Validate required fields have valid enum values
    if (!formData.subThemeCategory) {
      setError('Please select a sub-theme category')
      return
    }
    if (!formData.presentationType) {
      setError('Please select a presentation type')
      return
    }
    if (!formData.presenterGender) {
      setError('Please select a gender')
      return
    }
    if (!formData.professionalStatus.trim()) {
      setError('Please enter your professional status')
      return
    }

    setLoading(true)

    try {
      const response = await abstractsApi.create({
        subThemeCategory: formData.subThemeCategory,
        title: formData.title,
        authorInformation: formData.authorInformation,
        presentationType: formData.presentationType,
        presenterFullName: formData.presenterFullName,
        presenterEmail: formData.presenterEmail,
        presenterPhone: formData.presenterPhone,
        presenterInstitution: formData.presenterInstitution,
        presenterCountry: formData.presenterCountry,
        presenterGender: formData.presenterGender,
        professionalStatus: formData.professionalStatus,
        deanContact: formData.deanContact,
        abstractBody: formData.abstractBody,
      })

      if (response.data) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/submit/success')
        }, 2000)
      } else {
        setError(response.message || 'Submission failed')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col">
      <Header />
      <div className="flex-1 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="bg-white rounded-lg shadow-md p-6 my-6">
            <h1 className="text-3xl font-bold text-primary-700">Submit Your Abstract</h1>
            <p className="text-gray-600 mt-1">
              Complete the form below to submit your conference abstract
            </p>
          </div>

          {/* Submission Closed Banner */}
          {submissionClosed && (
            <div className="bg-white rounded-lg shadow-md p-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Abstract Submissions Are Closed</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                The submission window has ended. Thank you for your interest in the WFC Biennial Congress 2029.
                If you believe this is an error, please contact the organizing committee.
              </p>
            </div>
          )}

        {/* Form — hidden once submissions close */}
        {!submissionClosed && (
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red text-accent-red rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-accent-green/20 border border-accent-green text-green-800 rounded-lg">
              Abstract submitted successfully! Redirecting...
            </div>
          )}

          <p className="text-sm text-gray-500 mb-6">
            <span className="text-accent-red">*</span> Indicates required question
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sub-Theme Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub-Theme Category <span className="text-accent-red">*</span>
              </label>
              <p className="text-sm text-gray-500 italic mb-2">
                Select the sub-theme most relevant to your abstract
              </p>
              <select
                name="subThemeCategory"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.subThemeCategory}
                onChange={handleInputChange}
              >
                <option value="">Choose</option>
                {SUB_THEME_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Abstract Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Abstract Title <span className="text-accent-red">*</span>
              </label>
              <p className="text-sm text-gray-500 italic mb-2">Maximum 15 words, avoid abbreviations</p>
              <input
                type="text"
                name="title"
                required
                placeholder="Your answer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.title}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                Words: {countWords(formData.title)} / 15
              </p>
            </div>

            {/* Author Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author Information <span className="text-accent-red">*</span>
              </label>
              <p className="text-sm text-gray-500 italic mb-2">
                Include details for all authors, indicate Full Name, Highest Degree, Email and
                Institutional Affiliation.
              </p>
              <textarea
                name="authorInformation"
                required
                rows={4}
                placeholder="Your answer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.authorInformation}
                onChange={handleInputChange}
              />
            </div>

            {/* Type of presentation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type of presentation <span className="text-accent-red">*</span>
              </label>
              <select
                name="presentationType"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.presentationType}
                onChange={handleInputChange}
              >
                <option value="">Choose</option>
                {PRESENTATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Presenter's Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presenter&apos;s Full Name <span className="text-accent-red">*</span>
              </label>
              <input
                type="text"
                name="presenterFullName"
                required
                placeholder="Your answer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.presenterFullName}
                onChange={handleInputChange}
              />
            </div>

            {/* Presenter's Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presenter&apos;s Email Address <span className="text-accent-red">*</span>
              </label>
              <input
                type="email"
                name="presenterEmail"
                required
                placeholder="Your answer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.presenterEmail}
                onChange={handleInputChange}
              />
            </div>

            {/* Presenter's Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presenter&apos;s Phone Number <span className="text-accent-red">*</span>
              </label>
              <input
                type="tel"
                name="presenterPhone"
                required
                placeholder="Your answer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.presenterPhone}
                onChange={handleInputChange}
              />
            </div>

            {/* Presenter's Affiliated Institution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presenter&apos;s Affiliated Institution <span className="text-accent-red">*</span>
              </label>
              <input
                type="text"
                name="presenterInstitution"
                required
                placeholder="Your answer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.presenterInstitution}
                onChange={handleInputChange}
              />
            </div>

            {/* Country of the Presenter's Affiliated Institution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country of the Presenter&apos;s Affiliated Institution{' '}
                <span className="text-accent-red">*</span>
              </label>
              <select
                name="presenterCountry"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.presenterCountry}
                onChange={handleInputChange}
              >
                <option value="">Choose</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* Presenter's Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presenter&apos;s Gender <span className="text-accent-red">*</span>
              </label>
              <select
                name="presenterGender"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.presenterGender}
                onChange={handleInputChange}
              >
                <option value="">Choose</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Professional Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional Status <span className="text-accent-red">*</span>
              </label>
              <input
                type="text"
                name="professionalStatus"
                required
                placeholder="e.g. Faculty, Resident, Fellow, Student"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.professionalStatus}
                onChange={handleInputChange}
              />
            </div>

            {/* Optional: Dean contact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Optional: Please provide the email address and contact details of the Dean of School
                of Medicine or Provost at your University so we can invite them to the conference.
              </label>
              <textarea
                name="deanContact"
                rows={3}
                placeholder="Your answer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.deanContact}
                onChange={handleInputChange}
              />
            </div>

            {/* Abstract Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Abstract Body <span className="text-accent-red">*</span>
              </label>
              <p className="text-sm text-gray-500 italic mb-2">
                Please provide your abstract (maximum 300 words), including the Background, Methods,
                Findings, and Discussion.
              </p>
              <RichTextEditor
                value={formData.abstractBody}
                onChange={handleAbstractBodyChange}
                placeholder="Enter your abstract here..."
                maxWords={300}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear the form?')) {
                    setFormData({
                      subThemeCategory: '',
                      title: '',
                      authorInformation: '',
                      presentationType: '',
                      presenterFullName: '',
                      presenterEmail: '',
                      presenterPhone: '',
                      presenterInstitution: '',
                      presenterCountry: '',
                      presenterGender: '',
                      professionalStatus: '',
                      deanContact: '',
                      abstractBody: '',
                    })
                  }
                }}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Clear form
              </button>
            </div>
          </form>
        </div>
        )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
