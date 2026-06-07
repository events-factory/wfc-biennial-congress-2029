'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authApi, abstractsApi } from '@/lib/api'
import AppLayout from '@/components/AppLayout'
import type { StaffMember, StaffTopicAssignment } from '@/lib/types'

const SUB_THEME_CATEGORIES = [
  'Leadership, Governance, African Ownership and Partnerships for Health Workforce and Systems Transformation',
  'Transformative Technologies, AI, Innovation, and Simulation-based Education in Medical Education',
  'Towards a Healthier Africa: Maternal, Newborn, and Child Health (MNCH), Gender, Sexual & Reproductive Health, and Health Systems Strengthening',
  'Learner-Centered Systems: Assessment and Accreditation',
]

type QueueAbstract = {
  id: number
  title: string
  presenterFullName: string
  subThemeCategory: string
  status: string
  reviewed: boolean
  reviewedAt: string | null
  totalScore: number | null
}

const PAGE_SIZE = 10
const QUEUE_DETAIL_PAGE_SIZE = 20

export default function ManageReviewersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [warning, setWarning] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalStaff, setTotalStaff] = useState(0)

  // Search (debounced)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  // Queue stats per userId
  const [queueStats, setQueueStats] = useState<Record<number, { assigned: number; reviewed: number }>>({})

  // Queue detail modal
  const [queueDetailStaff, setQueueDetailStaff] = useState<StaffMember | null>(null)
  const [queueDetailLoading, setQueueDetailLoading] = useState(false)
  const [queueDetailAbstracts, setQueueDetailAbstracts] = useState<QueueAbstract[]>([])
  const [queueDetailPage, setQueueDetailPage] = useState(1)
  const [queueDetailTotalPages, setQueueDetailTotalPages] = useState(1)
  const [queueDetailQueueSize, setQueueDetailQueueSize] = useState(0)

  useEffect(() => {
    // Check authentication and super admin status
    const token = localStorage.getItem('authToken')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    const user = JSON.parse(userStr)

    // Verify user is super admin
    if (!user.isSuperAdmin) {
      router.push('/dashboard')
      return
    }

    fetchStaffMembers(1, '')
    fetchQueueStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Debounce: hold the search 300ms before refiring the query.
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Auto-dismiss toast notifications.
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 5000)
    return () => clearTimeout(t)
  }, [success])

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 7000)
    return () => clearTimeout(t)
  }, [error])

  useEffect(() => {
    if (!warning) return
    const t = setTimeout(() => setWarning(''), 6000)
    return () => clearTimeout(t)
  }, [warning])

  // Refetch whenever the debounced search changes; reset to page 1.
  useEffect(() => {
    fetchStaffMembers(1, searchDebounced)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDebounced])

  const fetchStaffMembers = async (targetPage: number, searchTerm: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await authApi.getAllStaff(targetPage, PAGE_SIZE, searchTerm)
      if (response.data) {
        const staffWithTopics = response.data.map((staff) => ({
          ...staff,
          topicAssignments: staff.topicAssignments || [],
        }))
        setStaffMembers(staffWithTopics)
        if (response.pagination) {
          setPage(response.pagination.page)
          setTotalPages(response.pagination.totalPages)
          setTotalStaff(response.pagination.total)
        }
      } else {
        setError(response.message || 'Failed to load staff members')
      }
    } catch (err) {
      console.error('Error fetching staff:', err)
      setError('An error occurred while loading staff members')
    } finally {
      setLoading(false)
    }
  }

  const fetchQueueStats = async () => {
    try {
      const response = await abstractsApi.getReviewerQueueStats()
      if (response.data) {
        const numericKeyed: Record<number, { assigned: number; reviewed: number }> = {}
        for (const [k, v] of Object.entries(response.data)) {
          numericKeyed[Number(k)] = v
        }
        setQueueStats(numericKeyed)
      }
    } catch (err) {
      console.error('Error fetching queue stats:', err)
    }
  }

  const handleOpenQueueDetail = async (staff: StaffMember) => {
    setQueueDetailStaff(staff)
    setQueueDetailPage(1)
    await loadQueueDetailPage(staff.id, 1)
  }

  const loadQueueDetailPage = async (userId: number, targetPage: number) => {
    setQueueDetailLoading(true)
    try {
      const response = await abstractsApi.getReviewerQueueAbstracts(
        userId, targetPage, QUEUE_DETAIL_PAGE_SIZE,
      )
      if (response.data) {
        setQueueDetailAbstracts(response.data.abstracts)
        setQueueDetailQueueSize(response.data.queueSize)
        if (response.pagination) {
          setQueueDetailPage(response.pagination.page)
          setQueueDetailTotalPages(response.pagination.totalPages)
        }
      }
    } finally {
      setQueueDetailLoading(false)
    }
  }

  const handleCloseQueueDetail = () => {
    setQueueDetailStaff(null)
    setQueueDetailAbstracts([])
    setQueueDetailPage(1)
    setQueueDetailTotalPages(1)
    setQueueDetailQueueSize(0)
  }

  const handleOpenTopicModal = (staff: StaffMember) => {
    setSelectedStaff(staff)
    setSelectedTopics(staff.topicAssignments.map((ta) => ta.topic))
    setShowTopicModal(true)
    setError('')
    setSuccess('')
    setWarning('')
  }

  const handleCloseTopicModal = () => {
    setShowTopicModal(false)
    setSelectedStaff(null)
    setSelectedTopics([])
  }

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    )
  }

  const handleSaveTopics = async () => {
    if (!selectedStaff) return

    setActionLoading(true)
    setError('')
    setSuccess('')
    setWarning('')

    try {
      console.log('Saving topics for staff ID:', selectedStaff.id)
      console.log('Selected staff:', selectedStaff)

      const currentTopics = selectedStaff.topicAssignments.map((ta) => ta.topic)
      const topicsToAdd = selectedTopics.filter((t) => !currentTopics.includes(t))
      const topicsToRemove = currentTopics.filter((t) => !selectedTopics.includes(t))

      console.log('Topics to add:', topicsToAdd)
      console.log('Topics to remove:', topicsToRemove)

      // Add new topics
      const addPromises = topicsToAdd.map((topic) => {
        console.log(`Assigning topic "${topic}" to user ${selectedStaff.id}`)
        return authApi.assignStaffTopic(selectedStaff.id, topic)
      })

      // Remove topics
      const removePromises = topicsToRemove.map((topic) => {
        console.log(`Removing topic "${topic}" from user ${selectedStaff.id}`)
        return authApi.removeStaffTopic(selectedStaff.id, topic)
      })

      const results = await Promise.allSettled([...addPromises, ...removePromises])

      console.log('Assignment results:', results)

      const failed = results.filter((r) => r.status === 'rejected')

      if (failed.length > 0) {
        console.error('Failed operations:', failed)
        // Get error details from failed promises
        const errorMessages = failed.map((f: any) => f.reason?.message || 'Unknown error').join(', ')
        setError(
          `Some topic changes failed: ${errorMessages}. Please check if the staff member exists in the database.`
        )
      } else {
        setSuccess(
          `Topics updated successfully for ${selectedStaff.firstName} ${selectedStaff.lastName}`
        )
        await fetchStaffMembers(page, searchDebounced)
        handleCloseTopicModal()
      }
    } catch (err) {
      console.error('Error in handleSaveTopics:', err)
      setError(`An error occurred while updating topics: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefreshQueue = async (staff: StaffMember) => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    setWarning('')

    try {
      const response = await abstractsApi.refreshReviewerQueue(staff.id)
      if (response.data) {
        const { added, removed, displaced, queueSize, capacity } = response.data
        if (added === 0 && queueSize === 0) {
          setWarning(
            `No free abstract to assign to ${staff.firstName} ${staff.lastName}.`,
          )
        } else {
          const displacedNote = displaced > 0 ? `, ${displaced} displaced from stale reviewers` : ''
          setSuccess(
            `Queue refreshed for ${staff.firstName} ${staff.lastName}: +${added} added, -${removed} cleared${displacedNote}, now ${queueSize}/${capacity}.`,
          )
        }
        await fetchQueueStats()
      } else {
        setError(response.message || 'Failed to refresh queue')
      }
    } catch (err) {
      console.error('Error refreshing queue:', err)
      setError('An error occurred while refreshing the queue')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveTopic = async (staff: StaffMember, topic: string) => {
    if (!confirm(`Remove topic "${topic}" from ${staff.firstName} ${staff.lastName}?`)) {
      return
    }

    setActionLoading(true)
    setError('')
    setSuccess('')
    setWarning('')

    try {
      await authApi.removeStaffTopic(staff.id, topic)
      setSuccess(`Topic removed successfully`)
      await fetchStaffMembers(page, searchDebounced)
    } catch (err) {
      setError('Failed to remove topic')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading staff members...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Manage Reviewers
                </h1>
                <p className="text-gray-500 text-sm">
                  Assign and manage topic access for staff reviewers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating toast notifications */}
        {(success || error || warning) && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-[min(720px,92vw)] space-y-3">
            {success && (
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-green-400 overflow-hidden animate-in fade-in slide-in-from-top-4 ring-4 ring-green-200/60">
                <div className="flex items-stretch">
                  <div className="bg-green-500 w-2 shrink-0" />
                  <div className="flex-1 px-6 py-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <svg
                        className="w-7 h-7 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="flex-1 text-base font-medium text-gray-900 leading-snug">
                      {success}
                    </p>
                    <button
                      onClick={() => setSuccess('')}
                      aria-label="Dismiss"
                      className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {warning && (
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-400 overflow-hidden animate-in fade-in slide-in-from-top-4 ring-4 ring-amber-200/60">
                <div className="flex items-stretch">
                  <div className="bg-amber-500 w-2 shrink-0" />
                  <div className="flex-1 px-6 py-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <svg
                        className="w-7 h-7 text-amber-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a1 1 0 011 1v3a1 1 0 11-2 0V6a1 1 0 011-1zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="flex-1 text-base font-medium text-gray-900 leading-snug">
                      {warning}
                    </p>
                    <button
                      onClick={() => setWarning('')}
                      aria-label="Dismiss"
                      className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-400 overflow-hidden animate-in fade-in slide-in-from-top-4 ring-4 ring-red-200/60">
                <div className="flex items-stretch">
                  <div className="bg-red-500 w-2 shrink-0" />
                  <div className="flex-1 px-6 py-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <svg
                        className="w-7 h-7 text-red-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="flex-1 text-base font-medium text-gray-900 leading-snug">
                      {error}
                    </p>
                    <button
                      onClick={() => setError('')}
                      aria-label="Dismiss"
                      className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.85 5.85a7.5 7.5 0 0010.8 10.8z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Staff List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Reviewer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Assigned Topics
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Queue
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staffMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  staffMembers.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                            {staff.firstName?.charAt(0)}
                            {staff.lastName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {staff.firstName} {staff.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            staff.isSuperAdmin
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {staff.isSuperAdmin ? 'Super Admin' : 'Staff'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {staff.topicAssignments.length === 0 ? (
                          <span className="text-sm text-gray-400 italic">
                            No topics assigned
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {staff.topicAssignments.map((assignment) => (
                              <span
                                key={assignment.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                              >
                                <span className="max-w-xs truncate">
                                  {assignment.topic}
                                </span>
                                <button
                                  onClick={() =>
                                    handleRemoveTopic(staff, assignment.topic)
                                  }
                                  disabled={actionLoading}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                  title="Remove topic"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const stats = queueStats[staff.id]
                          if (!stats || stats.assigned === 0) {
                            return <span className="text-xs text-gray-400 italic">Empty</span>
                          }
                          const pct = stats.assigned === 0 ? 0 : Math.round((stats.reviewed / stats.assigned) * 100)
                          const allDone = stats.reviewed === stats.assigned
                          return (
                            <button
                              onClick={() => handleOpenQueueDetail(staff)}
                              className={`group inline-flex flex-col items-start gap-1 text-left px-2.5 py-1 rounded-md border transition-colors ${
                                allDone
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              }`}
                              title="View this reviewer's queue"
                            >
                              <span className="text-xs font-semibold">
                                {stats.reviewed}<span className="opacity-60">/{stats.assigned}</span>
                                <span className="text-[10px] opacity-70 ml-1">reviewed</span>
                              </span>
                              <span className="block w-24 h-1 rounded-full bg-white/60 overflow-hidden">
                                <span
                                  className={`block h-full ${allDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </span>
                            </button>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleRefreshQueue(staff)}
                            disabled={actionLoading}
                            title="Add up to 20 unreviewed abstracts to this reviewer's queue"
                            className="px-3 py-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50"
                          >
                            Refresh Queue
                          </button>
                          <button
                            onClick={() => handleOpenTopicModal(staff)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50"
                          >
                            Manage Topics
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Page <span className="font-semibold">{page}</span> of{' '}
                <span className="font-semibold">{totalPages}</span> · {totalStaff} reviewers
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchStaffMembers(Math.max(1, page - 1), searchDebounced)}
                  disabled={loading || page <= 1}
                  className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => fetchStaffMembers(Math.min(totalPages, page + 1), searchDebounced)}
                  disabled={loading || page >= totalPages}
                  className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviewer Queue Detail Modal */}
      {queueDetailStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {queueDetailStaff.firstName} {queueDetailStaff.lastName}'s Queue
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {queueDetailQueueSize} abstracts assigned
                </p>
              </div>
              <button
                onClick={handleCloseQueueDetail}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {queueDetailLoading ? (
                <p className="text-sm text-gray-500 text-center py-8">Loading queue...</p>
              ) : queueDetailAbstracts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No abstracts in this queue.</p>
              ) : (
                <div className="space-y-2">
                  {queueDetailAbstracts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 px-3 py-2.5 border border-gray-100 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {a.presenterFullName} · {a.subThemeCategory}
                        </p>
                      </div>
                      {a.reviewed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 whitespace-nowrap">
                          ✓ Reviewed{a.totalScore != null ? ` · ${a.totalScore}/30` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 whitespace-nowrap">
                          Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {queueDetailTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Page <span className="font-semibold">{queueDetailPage}</span> of{' '}
                  <span className="font-semibold">{queueDetailTotalPages}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      queueDetailStaff &&
                      loadQueueDetailPage(queueDetailStaff.id, Math.max(1, queueDetailPage - 1))
                    }
                    disabled={queueDetailLoading || queueDetailPage <= 1}
                    className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() =>
                      queueDetailStaff &&
                      loadQueueDetailPage(queueDetailStaff.id, Math.min(queueDetailTotalPages, queueDetailPage + 1))
                    }
                    disabled={queueDetailLoading || queueDetailPage >= queueDetailTotalPages}
                    className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Topic Assignment Modal */}
      {showTopicModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Manage Topics
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedStaff.firstName} {selectedStaff.lastName}
                  </p>
                </div>
                <button
                  onClick={handleCloseTopicModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Select the topics this reviewer will have access to. They will only
                be able to view and review abstracts in their assigned topics.
              </p>
              <div className="space-y-2">
                {SUB_THEME_CATEGORIES.map((topic) => (
                  <label
                    key={topic}
                    className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(topic)}
                      onChange={() => handleTopicToggle(topic)}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 flex-1">{topic}</span>
                  </label>
                ))}
              </div>
              {selectedTopics.length > 0 && (
                <p className="text-sm text-primary-600 mt-4 font-medium">
                  {selectedTopics.length} topic(s) selected
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={handleCloseTopicModal}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTopics}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
