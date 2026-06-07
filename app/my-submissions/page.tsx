'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { abstractsApi } from '@/lib/api'
import type { Abstract, User } from '@/lib/types'
import AppLayout from '@/components/AppLayout'

export default function MySubmissionsPage() {
  const router = useRouter()
  const [abstracts, setAbstracts] = useState<Abstract[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    const user: User = JSON.parse(userStr)

    // Verify user is not staff/admin (is a submitter)
    if (user.isStaff || user.isSuperAdmin) {
      router.push('/dashboard')
      return
    }

    fetchMyAbstracts(user.email)
  }, [router])

  const fetchMyAbstracts = async (userEmail: string) => {
    setLoading(true)
    try {
      const response = await abstractsApi.getAll()

      if (response.data) {
        // Filter abstracts by current user email
        const userAbstracts = response.data.filter(
          (abstract) => abstract.submittedBy === userEmail
        )
        setAbstracts(userAbstracts)
      }
    } catch (error) {
      console.error('Error fetching abstracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-accent-green/10 text-accent-green border-accent-green'
      case 'rejected':
        return 'bg-accent-red/10 text-accent-red border-accent-red'
      case 'more_info_requested':
        return 'bg-yellow-50 text-yellow-700 border-yellow-300'
      case 'under_review':
        return 'bg-indigo-50 text-indigo-700 border-indigo-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'more_info_requested':
        return 'More Info Requested'
      case 'under_review':
        return 'Under Review'
      default:
        return 'Pending Review'
    }
  }

  const filteredAbstracts = abstracts.filter((abstract) => {
    if (filter === 'all') return true
    return abstract.status === filter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading your submissions...</div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
              <p className="text-gray-500 text-sm">Track your submitted abstracts</p>
            </div>
          </div>
        </div>
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({abstracts.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({abstracts.filter((a) => a.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved ({abstracts.filter((a) => a.status === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('more_info_requested')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'more_info_requested'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Info Requested ({abstracts.filter((a) => a.status === 'more_info_requested').length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'rejected'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected ({abstracts.filter((a) => a.status === 'rejected').length})
            </button>
          </div>
        </div>

        {/* Abstracts List */}
        {filteredAbstracts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No submissions found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "You haven't submitted any abstracts yet."
                : `You don't have any ${filter.replace('_', ' ')} submissions.`}
            </p>
            <Link
              href="/submit"
              className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              Submit Your First Abstract
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAbstracts.map((abstract) => (
              <div
                key={abstract.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {abstract.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Category:</strong> {abstract.subThemeCategory}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Type:</strong> {abstract.presentationType}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(
                      abstract.status
                    )}`}
                  >
                    {getStatusText(abstract.status)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>
                      Submitted: {new Date(abstract.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {abstract.reviewedAt && (
                      <span>
                        Reviewed: {new Date(abstract.reviewedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {abstract.status === 'more_info_requested' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚠️ The reviewer has requested additional information for this abstract.
                    </p>
                  </div>
                )}

                {abstract.status === 'approved' && (
                  <div className="mt-4 p-3 bg-accent-green/10 border border-accent-green rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      ✅ Congratulations! Your abstract has been approved for presentation.
                    </p>
                  </div>
                )}

                {abstract.status === 'rejected' && (
                  <div className="mt-4 p-3 bg-accent-red/10 border border-accent-red rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ❌ Your abstract was not accepted at this time.
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    href={`/submission/${abstract.id}`}
                    className="text-primary-500 hover:text-primary-600 font-medium text-sm"
                  >
                    View Details & Comments →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
