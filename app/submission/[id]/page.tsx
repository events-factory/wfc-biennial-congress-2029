'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { abstractsApi, coauthorsApi } from '@/lib/api'
import type { Abstract, AbstractCoauthor } from '@/lib/types'
import ChangelogModal from '@/components/ChangelogModal'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [abstract, setAbstract] = useState<Abstract | null>(null)
  const [coauthors, setCoauthors] = useState<AbstractCoauthor[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [abstractId, setAbstractId] = useState<string>('')
  const [newCoauthorEmail, setNewCoauthorEmail] = useState('')
  const [coauthorLoading, setCoauthorLoading] = useState(false)
  const [coauthorError, setCoauthorError] = useState('')
  const [coauthorSuccess, setCoauthorSuccess] = useState('')
  const [changelogModalOpen, setChangelogModalOpen] = useState(false)

  useEffect(() => {
    const initPage = async () => {
      // Unwrap params
      const { id } = await params
      setAbstractId(id)

      // Check authentication
      const token = localStorage.getItem('authToken')
      const userStr = localStorage.getItem('user')

      if (!token || !userStr) {
        router.push('/auth/login?role=submitter')
        return
      }

      const currentUser = JSON.parse(userStr)
      setUser(currentUser)

      fetchAbstractDetails(id, currentUser)
    }

    initPage()
  }, [params, router])

  const fetchAbstractDetails = async (id: string, currentUser: any) => {
    setLoading(true)
    try {
      const abstractId = parseInt(id)

      // Fetch abstract
      const abstractResponse = await abstractsApi.getById(abstractId)

      if (abstractResponse.data) {
        // Verify user owns this abstract
        if (abstractResponse.data.submittedBy !== currentUser.email) {
          router.push('/my-submissions')
          return
        }
        setAbstract(abstractResponse.data)
      }

      // Fetch co-authors
      const coauthorsResponse = await coauthorsApi.getByAbstractId(abstractId)
      if (coauthorsResponse.data) {
        setCoauthors(coauthorsResponse.data)
      }
    } catch (error) {
      console.error('Error fetching abstract:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-accent-green text-white'
      case 'rejected':
        return 'bg-accent-red text-white'
      case 'more_info_requested':
        return 'bg-yellow-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'more_info_requested':
        return 'Information Requested'
      default:
        return 'Pending Review'
    }
  }

  const handleInviteCoauthor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCoauthorEmail.trim() || !abstract) return

    setCoauthorLoading(true)
    setCoauthorError('')
    setCoauthorSuccess('')

    try {
      const response = await coauthorsApi.invite(abstract.id, newCoauthorEmail.trim())
      if (response.data) {
        setCoauthors([...coauthors, response.data])
        setNewCoauthorEmail('')
        setCoauthorSuccess('Co-author invited successfully!')
        setTimeout(() => setCoauthorSuccess(''), 3000)
      } else {
        setCoauthorError(response.message || 'Failed to invite co-author')
      }
    } catch (error) {
      setCoauthorError('An error occurred. Please try again.')
    } finally {
      setCoauthorLoading(false)
    }
  }

  const handleRemoveCoauthor = async (email: string) => {
    if (!abstract) return
    if (!confirm(`Are you sure you want to remove ${email} as a co-author?`)) return

    setCoauthorLoading(true)
    setCoauthorError('')

    try {
      const response = await coauthorsApi.remove(abstract.id, email)
      if (response.message) {
        setCoauthors(coauthors.filter((c) => c.userEmail !== email))
        setCoauthorSuccess('Co-author removed successfully!')
        setTimeout(() => setCoauthorSuccess(''), 3000)
      } else {
        setCoauthorError(response.message || 'Failed to remove co-author')
      }
    } catch (error) {
      setCoauthorError('An error occurred. Please try again.')
    } finally {
      setCoauthorLoading(false)
    }
  }

  const isOwner = user && abstract && abstract.submittedBy === user.email

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading submission details...</div>
      </div>
    )
  }

  if (!abstract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Submission not found</h2>
          <Link
            href="/my-submissions"
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            ← Back to My Submissions
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{abstract.title}</h1>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(abstract.status)}`}>
                  {getStatusText(abstract.status)}
                </span>
                {abstract.points != null && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                    {abstract.points} points
                  </span>
                )}
              </div>
            </div>

            {/* Edit button - only show if user is owner and status allows editing */}
            {isOwner && abstract.status !== 'approved' && abstract.status !== 'rejected' && (
              <Link
                href={`/edit-abstract/${abstract.id}`}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Edit Abstract
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Alert */}
            {abstract.status === 'more_info_requested' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Action Required</h3>
                <p className="text-yellow-700 mb-3">
                  The reviewer has requested additional information for your abstract.
                </p>
                {abstract.reviewNote && (
                  <div className="bg-white/60 border border-yellow-200 rounded-md p-3 mb-3 text-sm text-yellow-900 whitespace-pre-wrap">
                    <span className="font-semibold">Note from the reviewer:</span> {abstract.reviewNote}
                  </div>
                )}
                {isOwner && (
                  <Link
                    href={`/edit-abstract/${abstract.id}`}
                    className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm"
                  >
                    Edit Abstract Now
                  </Link>
                )}
              </div>
            )}

            {abstract.status === 'approved' && (
              <div className="bg-accent-green/10 border border-accent-green rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Abstract Approved</h3>
                <p className="text-green-700">
                  Congratulations! Your abstract has been approved for presentation at the conference.
                </p>
                {abstract.reviewNote && (
                  <div className="mt-3 bg-white/60 border border-green-200 rounded-md p-3 text-sm text-green-900 whitespace-pre-wrap">
                    <span className="font-semibold">Note from the reviewer:</span> {abstract.reviewNote}
                  </div>
                )}
              </div>
            )}

            {abstract.status === 'rejected' && (
              <div className="bg-accent-red/10 border border-accent-red rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Abstract Not Accepted</h3>
                <p className="text-red-700">
                  Your abstract was not accepted at this time.
                </p>
                {abstract.reviewNote && (
                  <div className="mt-3 bg-white/60 border border-red-200 rounded-md p-3 text-sm text-red-900 whitespace-pre-wrap">
                    <span className="font-semibold">Note from the reviewer:</span> {abstract.reviewNote}
                  </div>
                )}
              </div>
            )}

            {/* Abstract Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Abstract Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Sub-theme Category</label>
                  <p className="text-gray-900 mt-1">{abstract.subThemeCategory}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Presentation Type</label>
                  <p className="text-gray-900 mt-1">{abstract.presentationType}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Abstract Body</label>
                  <div
                    className="mt-2 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: abstract.abstractBody }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Author Information</label>
                  <p className="text-gray-900 mt-1 whitespace-pre-line">{abstract.authorInformation}</p>
                </div>
              </div>
            </div>

            {/* Presenter Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Presenter Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <p className="text-gray-900 mt-1">{abstract.presenterFullName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900 mt-1">{abstract.presenterEmail}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900 mt-1">{abstract.presenterPhone}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Country</label>
                  <p className="text-gray-900 mt-1">{abstract.presenterCountry}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <p className="text-gray-900 mt-1">{abstract.presenterGender}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Professional Status</label>
                  <p className="text-gray-900 mt-1">{abstract.professionalStatus}</p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Institution</label>
                  <p className="text-gray-900 mt-1">{abstract.presenterInstitution}</p>
                </div>

                {abstract.deanContact && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Dean/Contact Information</label>
                    <p className="text-gray-900 mt-1">{abstract.deanContact}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submission Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Info</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-gray-600">Submitted</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(abstract.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {abstract.reviewedAt && (
                  <div>
                    <label className="text-gray-600">Reviewed</label>
                    <p className="text-gray-900 font-medium">
                      {new Date(abstract.reviewedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-gray-600">Status</label>
                  <p className="text-gray-900 font-medium">{getStatusText(abstract.status)}</p>
                </div>
              </div>
            </div>

            {/* Co-authors */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Co-Authors ({coauthors.length})
              </h3>

              {coauthorSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {coauthorSuccess}
                </div>
              )}

              {coauthorError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {coauthorError}
                </div>
              )}

              {/* List of co-authors */}
              {coauthors.length > 0 && (
                <div className="space-y-3 mb-4">
                  {coauthors.map((coauthor) => (
                    <div
                      key={coauthor.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{coauthor.userEmail}</p>
                        <p className="text-xs text-gray-500">
                          Invited by {coauthor.invitedBy}
                        </p>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveCoauthor(coauthor.userEmail)}
                          disabled={coauthorLoading}
                          className="ml-3 text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add co-author form (only for owner) */}
              {isOwner && (
                <form onSubmit={handleInviteCoauthor} className="space-y-3">
                  <div>
                    <label htmlFor="coauthorEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Invite Co-Author
                    </label>
                    <input
                      type="email"
                      id="coauthorEmail"
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      value={newCoauthorEmail}
                      onChange={(e) => setNewCoauthorEmail(e.target.value)}
                      disabled={coauthorLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={coauthorLoading || !newCoauthorEmail.trim()}
                    className="w-full py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {coauthorLoading ? 'Inviting...' : 'Invite Co-Author'}
                  </button>
                </form>
              )}

              {!isOwner && coauthors.length === 0 && (
                <p className="text-gray-500 text-sm">No co-authors for this abstract.</p>
              )}
            </div>

            {/* View Change History Button */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change History</h3>
              <button
                onClick={() => setChangelogModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                View Full History
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Changelog Modal */}
      <ChangelogModal
        abstractId={parseInt(abstractId)}
        isOpen={changelogModalOpen}
        onClose={() => setChangelogModalOpen(false)}
      />

      <Footer />
    </div>
  )
}
