'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { abstractsApi } from '@/lib/api'
import type { Abstract } from '@/lib/types'
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

export default function EditAbstractPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [abstractId, setAbstractId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [abstract, setAbstract] = useState<Abstract | null>(null)

  const [formData, setFormData] = useState<{
    subThemeCategory: 'Leadership, Governance, and African Ownership in Health Professions Education' | 'Transformative Technologies, AI, and Innovation in Medical Education' | 'Simulation-Based Education and Experiential Learning' | 'Partnerships for Health Workforce and Systems Strengthening' | 'Education for Impact: MNCH, Gender, and Sexual & Reproductive Health' | 'Learners at the Center: Assessment, Accreditation, Research, and Implementation for Change'
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
    deanContact: string
    abstractBody: string
  }>({
    subThemeCategory: 'Leadership, Governance, and African Ownership in Health Professions Education',
    title: '',
    authorInformation: '',
    presentationType: 'Oral',
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

  useEffect(() => {
    const initPage = async () => {
      // Unwrap params
      const { id } = await params
      setAbstractId(id)

      // Check authentication
      const token = localStorage.getItem('authToken')
      const userStr = localStorage.getItem('user')

      if (!token || !userStr) {
        router.push('/auth/login')
        return
      }

      fetchAbstract(id)
    }

    initPage()
  }, [params, router])

  const fetchAbstract = async (id: string) => {
    setLoading(true)
    setError('')

    try {
      const abstractIdNum = parseInt(id)
      const response = await abstractsApi.getById(abstractIdNum)

      if (response.data) {
        const abstractData = response.data
        setAbstract(abstractData)

        // Check if user can edit this abstract
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          router.push('/auth/login')
          return
        }

        const currentUser = JSON.parse(userStr)

        // User must be the owner or co-author
        // For now, we'll check if they're the owner (co-author check would require fetching co-authors)
        if (abstractData.submittedBy !== currentUser.email) {
          setError('You can only edit abstracts you submitted or co-author')
          return
        }

        // Cannot edit if approved or rejected
        if (abstractData.status === 'approved' || abstractData.status === 'rejected') {
          setError(`Cannot edit an abstract that has been ${abstractData.status}`)
          return
        }

        // Populate form with existing data
        setFormData({
          subThemeCategory: abstractData.subThemeCategory as 'Leadership, Governance, and African Ownership in Health Professions Education' | 'Transformative Technologies, AI, and Innovation in Medical Education' | 'Simulation-Based Education and Experiential Learning' | 'Partnerships for Health Workforce and Systems Strengthening' | 'Education for Impact: MNCH, Gender, and Sexual & Reproductive Health' | 'Learners at the Center: Assessment, Accreditation, Research, and Implementation for Change',
          title: abstractData.title,
          authorInformation: abstractData.authorInformation,
          presentationType: abstractData.presentationType as 'Oral' | 'Poster' | 'Workshop',
          presenterFullName: abstractData.presenterFullName,
          presenterEmail: abstractData.presenterEmail,
          presenterPhone: abstractData.presenterPhone,
          presenterInstitution: abstractData.presenterInstitution,
          presenterCountry: abstractData.presenterCountry,
          presenterGender: abstractData.presenterGender || '',
          professionalStatus: abstractData.professionalStatus || '',
          deanContact: abstractData.deanContact || '',
          abstractBody: abstractData.abstractBody,
        })
      } else {
        setError('Failed to load abstract')
      }
    } catch (err) {
      setError('An error occurred while loading the abstract')
    } finally {
      setLoading(false)
    }
  }

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
    if (!formData.presenterGender) {
      setError('Please select a gender')
      return
    }
    if (!formData.professionalStatus.trim()) {
      setError('Please enter your professional status')
      return
    }

    setSaving(true)

    try {
      const response = await abstractsApi.update(parseInt(abstractId), formData)

      if (response.data) {
        setSuccess(true)
        setAbstract(response.data)
        setTimeout(() => {
          router.push(`/submission/${abstractId}`)
        }, 2000)
      } else {
        setError(response.message || 'Update failed')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading abstract...</div>
      </div>
    )
  }

  if (error && !abstract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-accent-red mb-4 text-lg font-semibold">{error}</div>
            <Link
              href="/my-submissions"
              className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              Back to My Submissions
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-primary-700">Edit Abstract</h1>
              <p className="text-gray-600 mt-1">
                Update your abstract submission
              </p>
              {abstract && (
                <div className="mt-2">
                  <span className="text-sm text-gray-500">
                    Status: <span className="font-semibold">{abstract.status}</span>
                  </span>
                </div>
              )}
            </div>
            <Link
              href={`/submission/${abstractId}`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Info Alert for more_info_requested status */}
        {abstract?.status === 'more_info_requested' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                  Reviewer Requested More Information
                </h3>
                <p className="text-sm text-yellow-700">
                  Please check the reviewer comments and update your abstract accordingly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red text-accent-red rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-accent-green/20 border border-accent-green text-green-800 rounded-lg">
              Abstract updated successfully! Redirecting...
            </div>
          )}

          <p className="text-sm text-gray-500 mb-6">
            <span className="text-accent-red">*</span> Indicates required field
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sub-Theme Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub-Theme Category <span className="text-accent-red">*</span>
              </label>
              <select
                name="subThemeCategory"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.subThemeCategory}
                onChange={handleInputChange}
              >
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
                Include details for all authors: Full Name, Highest Degree, Email and Institutional Affiliation
              </p>
              <textarea
                name="authorInformation"
                required
                rows={4}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.presenterInstitution}
                onChange={handleInputChange}
              />
            </div>

            {/* Country */}
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
                Optional: Dean or Provost Contact Information
              </label>
              <textarea
                name="deanContact"
                rows={3}
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
                Maximum 300 words, including Background, Methods, Findings, and Discussion
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
                disabled={saving}
                className="px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
              <Link
                href={`/submission/${abstractId}`}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}
