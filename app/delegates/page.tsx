'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { delegatesApi, DelegateTableHeader, Delegate, DelegateDetailResponse } from '@/lib/api'
import AppLayout from '@/components/AppLayout'

export default function DelegatesPage() {
  const router = useRouter()
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [headers, setHeaders] = useState<DelegateTableHeader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Full delegate details (fetched on demand when opening the View modal)
  const [delegateDetails, setDelegateDetails] = useState<DelegateDetailResponse['data'] | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    const user = JSON.parse(userStr)
    if (!user.isStaff && !user.isSuperAdmin) {
      router.push('/')
      return
    }

    fetchData()
  }, [router])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.action-menu-container')) {
        setOpenActionMenu(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      const [headersResponse, delegatesResponse] = await Promise.all([
        delegatesApi.getTableHeaders(),
        delegatesApi.getAll(),
      ])

      if (headersResponse.data) {
        setHeaders(headersResponse.data)
      }

      if (delegatesResponse.data) {
        setDelegates(delegatesResponse.data)
      }
    } catch (err) {
      console.error('Error fetching delegates:', err)
      setError('Failed to load delegates. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get display columns - skip Prefix (index 0), show First Name, Last Name, Email + Status + Actions
  const displayHeaders = headers.slice(1, 5) // First Name, Last Name, Email, Date of Birth

  // Filter delegates based on search term
  const filteredDelegates = useMemo(() => {
    if (!searchTerm) return delegates
    const searchLower = searchTerm.toLowerCase()
    return delegates.filter((delegate) =>
      Object.values(delegate).some((value) => {
        const strValue = String(value || '')
        const textContent = strValue.replace(/<[^>]*>/g, '')
        return textContent.toLowerCase().includes(searchLower)
      })
    )
  }, [delegates, searchTerm])

  // Pagination calculations
  const totalPages = Math.ceil(filteredDelegates.length / pageSize)
  const paginatedDelegates = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredDelegates.slice(startIndex, startIndex + pageSize)
  }, [filteredDelegates, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Get delegate data value by index
  const getDelegateValue = (delegate: Delegate, dataIndex: number): string => {
    const keys = Object.keys(delegate)
      .filter(k => !isNaN(Number(k)))
      .sort((a, b) => Number(a) - Number(b))

    const key = keys[dataIndex]
    if (key) {
      const value = delegate[key]
      if (value !== null && value !== undefined && value !== '') {
        return String(value)
      }
    }
    return ''
  }

  // Extract status info from delegate data (indices 1-3 contain status/badges)
  const getStatusInfo = (delegate: Delegate) => {
    const html1 = getDelegateValue(delegate, 1)
    const html2 = getDelegateValue(delegate, 2)
    const html3 = getDelegateValue(delegate, 3)
    const allHtml = `${html1} ${html2} ${html3}`

    // Invitation status
    let invitationStatus: { text: string; color: string; bgColor: string } | null = null
    if (allHtml.includes('INVITATION NOT SENT')) {
      invitationStatus = { text: 'Not Sent', color: 'text-orange-700', bgColor: 'bg-orange-100' }
    } else if (allHtml.includes('INVITATION SENT') || allHtml.includes('COMPLETED')) {
      invitationStatus = { text: 'Sent', color: 'text-green-700', bgColor: 'bg-green-100' }
    }

    // Payment status (FREE, PAID, PENDING)
    let paymentStatus: { text: string; color: string; bgColor: string } | null = null
    if (allHtml.includes('>FREE<') || allHtml.includes("'FREE'") || allHtml.toLowerCase().includes('free</span>')) {
      paymentStatus = { text: 'Free', color: 'text-blue-700', bgColor: 'bg-blue-100' }
    } else if (allHtml.includes('>PAID<') || allHtml.toLowerCase().includes('paid</span>')) {
      paymentStatus = { text: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' }
    } else if (allHtml.includes('>PENDING<') || allHtml.toLowerCase().includes('pending</span>')) {
      paymentStatus = { text: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' }
    }

    return { invitationStatus, paymentStatus }
  }

  // Get category/organization badge (look for colored badge that's not FREE/PAID/status)
  const getCategoryBadge = (delegate: Delegate) => {
    const html1 = getDelegateValue(delegate, 1)
    const html2 = getDelegateValue(delegate, 2)
    const html3 = getDelegateValue(delegate, 3)

    // Look through all HTML for organization badges
    for (const html of [html3, html2, html1]) {
      if (html.includes('<span') && html.includes('badge')) {
        // Extract text and background color
        const textMatch = html.match(/>([^<]+)</)?.[1]
        const bgMatch = html.match(/background:\s*([^'";\s]+)/)?.[1]

        // Skip if it's a status badge (FREE, PAID, PENDING, SENT, etc.)
        if (textMatch) {
          const upperText = textMatch.toUpperCase().trim()
          if (!['FREE', 'PAID', 'PENDING', 'SENT', 'NOT SENT', 'COMPLETED', 'INVITATION'].includes(upperText) &&
              !upperText.includes('INVITATION')) {
            return { text: textMatch, bgColor: bgMatch || '#6c757d' }
          }
        }
      }
    }
    return null
  }

  // Parse the per-delegate "Other Info" embedded in the action cell (slot 0):
  // Pay. Status, To pay, Paid and Remaining amounts.
  const getPaymentDetails = (delegate: Delegate) => {
    const html = getDelegateValue(delegate, 0)

    const grabAmount = (label: string): { amount: number; currency: string; raw: string } | null => {
      // e.g. "To pay: 30 USD" inside a dropdown-item anchor
      const match = html.match(new RegExp(`${label}\\s*:?\\s*([\\d.,]+)\\s*([A-Za-z]{2,4})`))
      if (!match) return null
      const currency = (match[2] || 'USD').toUpperCase()
      return {
        amount: parseFloat(match[1].replace(/,/g, '')),
        currency,
        raw: `${match[1]} ${currency}`,
      }
    }

    return {
      toPay: grabAmount('To pay'),
      paid: grabAmount('Paid'),
      remaining: grabAmount('Remaining'),
    }
  }

  // Completeness badge (slot 1): COMPLETED vs INCOMPLETE/MISSING INFORMATION
  const getCompletenessStatus = (delegate: Delegate): string | null => {
    const html = getDelegateValue(delegate, 1)
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().replace(/,\s*$/, '')
    return text || null
  }

  // Breakdown of registrations per category (based on the filtered set),
  // including payment status counts and the amount collected per category.
  const categoryBreakdown = useMemo(() => {
    interface CategoryStat {
      name: string
      count: number
      color: string
      paid: number
      pending: number
      free: number
      amountPaid: number
      currency: string
    }

    const stats = new Map<string, CategoryStat>()

    filteredDelegates.forEach((delegate) => {
      const category = getCategoryBadge(delegate)
      const name = category?.text?.trim() || 'Uncategorized'
      const color = category?.bgColor || '#6c757d'
      const { paymentStatus } = getStatusInfo(delegate)
      // Real amount paid (parsed from the delegate's "Other Info" cell)
      const payment = getPaymentDetails(delegate)

      let entry = stats.get(name)
      if (!entry) {
        entry = {
          name,
          count: 0,
          color,
          paid: 0,
          pending: 0,
          free: 0,
          amountPaid: 0,
          currency: payment.paid?.currency || payment.toPay?.currency || 'USD',
        }
        stats.set(name, entry)
      }

      entry.count += 1
      if (payment.paid) {
        entry.amountPaid += payment.paid.amount
        entry.currency = payment.paid.currency
      }

      const status = paymentStatus?.text
      if (status === 'Paid') {
        entry.paid += 1
      } else if (status === 'Pending') {
        entry.pending += 1
      } else if (status === 'Free') {
        entry.free += 1
      }
    })

    return Array.from(stats.values()).sort((a, b) => b.count - a.count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDelegates])

  // Data field mapping: headerIndex maps to delegate array index
  // Headers: [0: Prefix, 1: First Name, 2: Last Name, 3: Email, 4: DOB, 5: Nationality...]
  // Delegate: [0: actions, 1: status, 2: badge?, 3: org badge, 4: ?, 5: firstName, 6: lastName, 7: email...]
  const getFieldValue = (delegate: Delegate, headerIndex: number): string => {
    // Map header index to delegate data index
    // First Name (header 1) -> delegate[5]
    // Last Name (header 2) -> delegate[6]
    // Email (header 3) -> delegate[7]
    // etc.
    const dataIndex = headerIndex + 4
    const value = getDelegateValue(delegate, dataIndex)

    // Skip if it's HTML
    if (value.includes('<') && value.includes('>')) {
      return '-'
    }

    return value || '-'
  }

  // Strip surrounding markup/quotes from a raw delegate value so it renders cleanly.
  const cleanValue = (raw: string): string => {
    // Remove HTML tags, collapse whitespace, and trim stray leading quotes
    const stripped = raw
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return stripped.replace(/^'+|'+$/g, '').trim()
  }

  // Build the list of detail fields actually available for a delegate.
  // NOTE: the delegates-list API only returns name, email, the badge cells and
  // the embedded payment info — it does NOT return the extended registration
  // fields (DOB, nationality, phone, institution, etc.). We therefore only show
  // fields that have real data rather than rendering the full (mostly-empty)
  // schema, which previously made populated records look blank.
  const getDelegateDetails = (delegate: Delegate) => {
    const details: { label: string; value: string; isHtml?: boolean }[] = []

    const firstName = cleanValue(getDelegateValue(delegate, 5))
    const lastName = cleanValue(getDelegateValue(delegate, 6))
    const email = cleanValue(getDelegateValue(delegate, 7))

    // Category badge (first, for prominence)
    const category = getCategoryBadge(delegate)
    if (category) {
      details.push({
        label: 'Category',
        value: `<span class="badge text-white" style="background: ${category.bgColor}">${category.text}</span>`,
        isHtml: true,
      })
    }

    // Registration completeness
    const completeness = getCompletenessStatus(delegate)
    if (completeness) {
      details.push({ label: 'Registration Status', value: completeness })
    }

    if (firstName) details.push({ label: 'First Name', value: firstName })
    if (lastName) details.push({ label: 'Last Name', value: lastName })
    if (email) details.push({ label: 'Email', value: email })

    // Invitation + payment status (derived from the badge HTML)
    const status = getStatusInfo(delegate)
    if (status.invitationStatus) {
      details.push({ label: 'Invitation Status', value: status.invitationStatus.text })
    }
    if (status.paymentStatus) {
      details.push({ label: 'Payment Status', value: status.paymentStatus.text })
    }

    // Per-delegate payment amounts parsed from the action cell
    const payment = getPaymentDetails(delegate)
    if (payment.toPay) details.push({ label: 'Amount To Pay', value: payment.toPay.raw })
    if (payment.paid) details.push({ label: 'Amount Paid', value: payment.paid.raw })
    if (payment.remaining) details.push({ label: 'Amount Remaining', value: payment.remaining.raw })

    return details
  }

  // Build the detail grid items. When the full record has been fetched
  // (delegateDetails) we show every registration field plus payment/meta info;
  // otherwise we fall back to the limited data available in the list row.
  const buildDetailItems = (
    data: DelegateDetailResponse['data'] | null,
    fallback: Delegate,
  ): { label: string; value: string; isHtml?: boolean }[] => {
    if (!data) return getDelegateDetails(fallback)

    const items: { label: string; value: string; isHtml?: boolean }[] = []
    const d = data.delegate || {}
    const str = (v: unknown) => (v === null || v === undefined ? '' : String(v)).trim()

    // All registration form fields
    data.records.forEach((r) => {
      items.push({ label: r.input_name, value: str(r.input_value) || '—' })
    })

    // Registration + payment meta from the delegate object
    const meta: [string, string][] = [
      ['Category', str(d.ticket_name)],
      ['Attendance Type', str(d.attendence_type)],
      ['Registration Status', str(d.registration_status)],
      ['Payment Status', str(d.payment_status)],
      ['Amount To Pay', str(d.amount_to_pay)],
      ['Amount Paid', str(d.amount_received)],
      ['Registered On', str(d.done_on)],
    ]
    meta.forEach(([label, value]) => {
      if (value) items.push({ label, value })
    })

    return items
  }

  // Action handlers
  const handleView = async (delegate: Delegate) => {
    setSelectedDelegate(delegate)
    setShowViewModal(true)
    setOpenActionMenu(null)

    // Fetch the full registration record (all form fields) for this delegate
    setDelegateDetails(null)
    setDetailsError('')

    const badgeId = getDelegateValue(delegate, 4).replace(/[^0-9]/g, '')
    if (!badgeId) {
      setDetailsError('Could not determine delegate id')
      return
    }

    setDetailsLoading(true)
    try {
      const response = await delegatesApi.getDetails(badgeId)
      if (response?.data) {
        setDelegateDetails(response.data)
      } else {
        setDetailsError('No additional details available')
      }
    } catch (err) {
      console.error('Failed to load delegate details:', err)
      setDetailsError('Failed to load full details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleResendInvitation = async (delegate: Delegate) => {
    const email = getDelegateValue(delegate, 7)
    const firstName = getDelegateValue(delegate, 5)
    setActionLoading('resend')
    setOpenActionMenu(null)

    // Simulate API call - replace with actual API when available
    await new Promise(resolve => setTimeout(resolve, 1000))

    alert(`Invitation resent to ${firstName} (${email})`)
    setActionLoading(null)
  }

  const handleMarkComplete = async (delegate: Delegate) => {
    setActionLoading('complete')
    setOpenActionMenu(null)

    // Simulate API call - replace with actual API when available
    await new Promise(resolve => setTimeout(resolve, 1000))

    alert('Delegate marked as complete')
    setActionLoading(null)
    fetchData() // Refresh data
  }

  const handleDelete = async (delegate: Delegate) => {
    const email = getDelegateValue(delegate, 7)
    const firstName = getDelegateValue(delegate, 5)
    const lastName = getDelegateValue(delegate, 6)

    if (confirm(`Are you sure you want to delete ${firstName} ${lastName} (${email})? This action cannot be undone.`)) {
      setActionLoading('delete')
      setOpenActionMenu(null)

      // Simulate API call - replace with actual API when available
      await new Promise(resolve => setTimeout(resolve, 1000))

      alert('Delegate deleted successfully')
      setActionLoading(null)
      fetchData() // Refresh data
    } else {
      setOpenActionMenu(null)
    }
  }

  const closeViewModal = () => {
    setShowViewModal(false)
    setSelectedDelegate(null)
    setDelegateDetails(null)
    setDetailsError('')
    setDetailsLoading(false)
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delegates</h1>
                <p className="text-gray-500 text-sm">View all registered delegates</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 bg-primary-50 px-4 py-2 rounded-lg">
                Total Delegates:{' '}
                <span className="font-semibold text-primary-600">{delegates.length}</span>
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
            <button
              onClick={fetchData}
              className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search delegates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Delegates Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3 text-gray-500">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading delegates...
              </div>
            </div>
          ) : filteredDelegates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-5xl mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchTerm ? 'No delegates found' : 'No delegates yet'}
              </h3>
              <p className="text-gray-500">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Delegates will appear here once they are invited'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                        #
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        First Name
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Last Name
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedDelegates.map((delegate, index) => {
                      const rowId = `row-${index}`
                      const categoryBadge = getCategoryBadge(delegate)
                      const statusInfo = getStatusInfo(delegate)

                      return (
                        <tr key={delegate.id || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                            {getFieldValue(delegate, 1) !== '-' ? getFieldValue(delegate, 1) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {getFieldValue(delegate, 2) !== '-' ? getFieldValue(delegate, 2) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {getFieldValue(delegate, 3) !== '-' ? getFieldValue(delegate, 3) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {categoryBadge ? (
                              <span
                                className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: categoryBadge.bgColor }}
                              >
                                {categoryBadge.text}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <div className="flex flex-wrap gap-1.5">
                              {statusInfo.invitationStatus && (
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusInfo.invitationStatus.bgColor} ${statusInfo.invitationStatus.color}`}>
                                  {statusInfo.invitationStatus.text}
                                </span>
                              )}
                              {statusInfo.paymentStatus && (
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusInfo.paymentStatus.bgColor} ${statusInfo.paymentStatus.color}`}>
                                  {statusInfo.paymentStatus.text}
                                </span>
                              )}
                              {!statusInfo.invitationStatus && !statusInfo.paymentStatus && (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-center relative">
                            <div className="relative inline-block action-menu-container">
                              <button
                                onClick={() => {
                                  setOpenActionMenu(openActionMenu === rowId ? null : rowId)
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>

                              {openActionMenu === rowId && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                  <button
                                    onClick={() => handleView(delegate)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => handleResendInvitation(delegate)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Resend Invitation
                                  </button>
                                  <button
                                    onClick={() => handleMarkComplete(delegate)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Mark Complete
                                  </button>
                                  <hr className="my-1 border-gray-200" />
                                  <button
                                    onClick={() => handleDelete(delegate)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>entries</span>
                  <span className="ml-4 text-gray-500">
                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(currentPage * pageSize, filteredDelegates.length)} of{' '}
                    {filteredDelegates.length} entries
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {getPageNumbers().map((page, idx) => (
                    typeof page === 'number' ? (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-primary-500 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={idx} className="px-2 text-gray-400">...</span>
                    )
                  ))}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Registrations by Category */}
        {!loading && categoryBreakdown.length > 0 && (() => {
          const totalRegistrations = categoryBreakdown.reduce(
            (sum, item) => sum + item.count,
            0,
          )

          // Total amount collected, grouped by currency
          const amountByCurrency = new Map<string, number>()
          categoryBreakdown.forEach((item) => {
            if (item.amountPaid > 0) {
              amountByCurrency.set(
                item.currency,
                (amountByCurrency.get(item.currency) || 0) + item.amountPaid,
              )
            }
          })
          const formatAmount = (amount: number, currency: string) =>
            `${amount.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })} ${currency}`
          const totalPaidLabel =
            amountByCurrency.size > 0
              ? Array.from(amountByCurrency.entries())
                  .map(([currency, amount]) => formatAmount(amount, currency))
                  .join(' + ')
              : '—'

          return (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Registrations by Category
                  </h2>
                  <p className="text-sm text-gray-500">
                    Registrations and amount paid per category
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="text-sm text-gray-600 bg-primary-50 px-4 py-2 rounded-lg">
                    Total Registrations:{' '}
                    <span className="font-semibold text-primary-600">
                      {totalRegistrations}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-lg">
                    Amount Paid:{' '}
                    <span className="font-semibold text-green-700">
                      {totalPaidLabel}
                    </span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">
                        Registrations
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">
                        Amount Paid
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categoryBreakdown.map((item) => (
                      <tr key={item.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {item.count}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {item.paid > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                {item.paid} Paid
                              </span>
                            )}
                            {item.pending > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                {item.pending} Pending
                              </span>
                            )}
                            {item.free > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {item.free} Free
                              </span>
                            )}
                            {item.paid === 0 && item.pending === 0 && item.free === 0 && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {item.amountPaid > 0
                            ? formatAmount(item.amountPaid, item.currency)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* Stats Cards */}
        {!loading && delegates.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Delegates</div>
                  <div className="text-2xl font-bold text-gray-900">{delegates.length}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Showing</div>
                  <div className="text-2xl font-bold text-gray-900">{filteredDelegates.length}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Data Fields</div>
                  <div className="text-2xl font-bold text-gray-900">{headers.length}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Delegate Modal */}
      {showViewModal && selectedDelegate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-900/50 transition-opacity"
              onClick={closeViewModal}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto transform transition-all">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                    {getFieldValue(selectedDelegate, 1).charAt(0)}{getFieldValue(selectedDelegate, 2).charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {getFieldValue(selectedDelegate, 1)} {getFieldValue(selectedDelegate, 2)}
                    </h2>
                    <p className="text-sm text-gray-500">{getFieldValue(selectedDelegate, 3)}</p>
                  </div>
                </div>
                <button
                  onClick={closeViewModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                {detailsLoading && (
                  <div className="flex items-center justify-center gap-3 py-6 text-gray-500 text-sm">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading full details...
                  </div>
                )}

                {!detailsLoading && detailsError && (
                  <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
                    {detailsError}. Showing limited information from the list.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {buildDetailItems(delegateDetails, selectedDelegate).map((detail, idx) => (
                    <div
                      key={idx}
                      className={`p-4 bg-gray-50 rounded-xl ${
                        detail.label === 'Email' || detail.label.includes('Institution') || detail.label.includes('Area')
                          ? 'md:col-span-2'
                          : ''
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        {detail.label}
                      </p>
                      {detail.isHtml ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: detail.value }}
                          className="text-sm text-gray-900"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 font-medium">
                          {detail.value || <span className="text-gray-400">-</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Status Overview */}
                <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Overview</h3>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const status = getStatusInfo(selectedDelegate)
                      const category = getCategoryBadge(selectedDelegate)
                      return (
                        <>
                          {category && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Category:</span>
                              <span
                                className="inline-flex px-3 py-1 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: category.bgColor }}
                              >
                                {category.text}
                              </span>
                            </div>
                          )}
                          {status.invitationStatus && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Invitation:</span>
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${status.invitationStatus.bgColor} ${status.invitationStatus.color}`}>
                                {status.invitationStatus.text}
                              </span>
                            </div>
                          )}
                          {status.paymentStatus && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Payment:</span>
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${status.paymentStatus.bgColor} ${status.paymentStatus.color}`}>
                                {status.paymentStatus.text}
                              </span>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap gap-3 justify-end">
                <button
                  onClick={() => {
                    closeViewModal()
                    handleResendInvitation(selectedDelegate)
                  }}
                  disabled={actionLoading === 'resend'}
                  className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Resend Invitation
                </button>
                <button
                  onClick={() => {
                    closeViewModal()
                    handleMarkComplete(selectedDelegate)
                  }}
                  disabled={actionLoading === 'complete'}
                  className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark Complete
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedDelegate)
                    closeViewModal()
                  }}
                  disabled={actionLoading === 'delete'}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                <button
                  onClick={closeViewModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
