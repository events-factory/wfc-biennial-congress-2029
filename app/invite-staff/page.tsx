'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import AppLayout from '@/components/AppLayout'

const SUB_THEME_CATEGORIES = [
  'Leadership, Governance, African Ownership and Partnerships for Health Workforce and Systems Transformation',
  'Transformative Technologies, AI, Innovation, and Simulation-based Education in Medical Education',
  'Towards a Healthier Africa: Maternal, Newborn, and Child Health (MNCH), Gender, Sexual & Reproductive Health, and Health Systems Strengthening',
  'Learner-Centered Systems: Assessment and Accreditation',
]

export default function InviteStaffPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  })

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    const user = JSON.parse(userStr)

    // Verify user is staff or super admin
    if (!user.isStaff && !user.isSuperAdmin) {
      router.push('/')
      return
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      // Step 1: Invite the staff member
      const response = await authApi.inviteStaff({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      if (response.data) {
        const newStaffId = response.data.id

        // Step 2: Assign selected topics to the new staff member
        if (selectedTopics.length > 0) {
          const topicAssignmentPromises = selectedTopics.map((topic) =>
            authApi.assignStaffTopic(newStaffId, topic)
          )

          const topicResults = await Promise.allSettled(topicAssignmentPromises)

          // Check if any topic assignments failed
          const failedTopics = topicResults
            .map((result, index) => ({
              result,
              topic: selectedTopics[index],
            }))
            .filter(({ result }) => result.status === 'rejected')

          if (failedTopics.length > 0) {
            setSuccess(
              `Reviewer ${formData.firstName} ${formData.lastName} invited successfully! However, some topic assignments failed. Please assign topics manually from the staff management page.`
            )
          } else {
            setSuccess(
              `Reviewer ${formData.firstName} ${formData.lastName} invited successfully with ${selectedTopics.length} topic(s) assigned!`
            )
          }
        } else {
          setSuccess(
            `Reviewer ${formData.firstName} ${formData.lastName} invited successfully! Note: No topics were assigned.`
          )
        }

        // Reset form
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: '',
        })
        setSelectedTopics([])
      } else {
        setError(response.message || 'Failed to invite reviewer')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Invite Reviewer</h1>
              <p className="text-gray-500 text-sm">Add a new reviewer to the team</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Invitation Form */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Reviewer Details
            </h2>
            <p className="text-sm text-gray-600">
              The new reviewer will be able to review abstracts in their assigned topics and request more
              information. Only super admins can approve or reject abstracts.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address <span className="text-accent-red">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="reviewer@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  First Name <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  required
                  placeholder="John"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={formData.firstName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Last Name <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  required
                  placeholder="Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password <span className="text-accent-red">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.password}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password <span className="text-accent-red">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                minLength={8}
                placeholder="Re-enter password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
            </div>

            {/* Topic Assignment */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Assign Topics
              </label>
              <p className="text-xs text-gray-500 mb-4">
                Select the topics this reviewer will have access to. If no topics are selected, you can assign them later from the staff management page.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                {SUB_THEME_CATEGORIES.map((topic) => (
                  <label
                    key={topic}
                    className="flex items-start gap-3 p-3 hover:bg-white rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(topic)}
                      onChange={() => handleTopicToggle(topic)}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 flex-1">
                      {topic}
                    </span>
                  </label>
                ))}
              </div>
              {selectedTopics.length > 0 && (
                <p className="text-sm text-primary-600 mt-2 font-medium">
                  {selectedTopics.length} topic(s) selected
                </p>
              )}
            </div>

            {/* Information Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Reviewer Account Information
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        The new reviewer will receive access to the reviewer
                        dashboard
                      </li>
                      <li>
                        They can review and request more information on abstracts
                        in their assigned topics
                      </li>
                      <li>
                        They can add comments to abstracts in their assigned topics
                      </li>
                      <li>
                        If no topics are assigned, they won&apos;t see any abstracts until
                        topics are assigned by a super admin
                      </li>
                      <li>
                        Note: Only super admins can approve or reject abstracts
                      </li>
                      <li>
                        Make sure to share the login credentials securely with
                        the new team member
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Inviting...' : 'Invite Reviewer'}
              </button>
              <Link
                href="/dashboard"
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
