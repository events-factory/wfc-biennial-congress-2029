'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { abstractsApi } from '@/lib/api';
import type { Abstract } from '@/lib/types';
import AppLayout from '@/components/AppLayout';

const PAGE_SIZE = 25;

// Map a Phase 1 score (0-30) to a tier, for colour-coding badges and chips.
// Thresholds mirror the backend `getReviewerRecommendation` boundaries.
function scoreTier(score: number): 'excellent' | 'good' | 'fair' | 'weak' | 'poor' {
  if (score >= 25) return 'excellent';
  if (score >= 20) return 'good';
  if (score >= 15) return 'fair';
  if (score >= 10) return 'weak';
  return 'poor';
}

const TIER_BADGE: Record<ReturnType<typeof scoreTier>, string> = {
  excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  good: 'bg-green-50 text-green-700 border-green-200',
  fair: 'bg-amber-50 text-amber-700 border-amber-200',
  weak: 'bg-orange-50 text-orange-700 border-orange-200',
  poor: 'bg-red-50 text-red-700 border-red-200',
};

const TIER_CHIP: Record<ReturnType<typeof scoreTier>, string> = {
  excellent: 'bg-emerald-100 text-emerald-800',
  good: 'bg-green-100 text-green-800',
  fair: 'bg-amber-100 text-amber-800',
  weak: 'bg-orange-100 text-orange-800',
  poor: 'bg-red-100 text-red-800',
};

function reviewerInitials(email: string): string {
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const [abstracts, setAbstracts] = useState<Abstract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'more_info_requested' | 'my_assigned'
  >('all');
  const [reviewFilter, setReviewFilter] = useState<
    'any' | '0' | '1' | '2' | '2plus' | 'admin'
  >('any');
  const [scoreFilter, setScoreFilter] = useState<
    'any' | 'below15' | '15to19' | '20plus'
  >('any');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAbstracts, setTotalAbstracts] = useState(0); // server total, used for pagination display
  const [filteredTotal, setFilteredTotal] = useState(0); // server total for current filter (status + reviewFilter)
  const [search, setSearch] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, under_review: 0, approved: 0, rejected: 0, more_info_requested: 0 });
  const [exportLoading, setExportLoading] = useState(false);
  const [allAbstracts, setAllAbstracts] = useState<Abstract[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [myAssignedCount, setMyAssignedCount] = useState(0);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/auth/login?role=reviewer');
      return;
    }

    const userData = JSON.parse(user);
    if (!userData.isStaff && !userData.isSuperAdmin) {
      router.push('/');
      return;
    }

    setIsSuperAdmin(!!userData.isSuperAdmin);
    if (userData.id) setCurrentUserId(userData.id);
  }, [router]);

  const fetchAbstracts = async (
    page: number,
    statusFilter: typeof filter,
    rFilter: typeof reviewFilter,
    sFilter: typeof scoreFilter,
  ) => {
    setLoading(true);

    if (statusFilter === 'my_assigned') {
      const res = await abstractsApi.getMySCAssignments();
      if (res.data && Array.isArray(res.data)) {
        const assigned = res.data.map((a) => a.abstract);
        const start = (page - 1) * PAGE_SIZE;
        setAbstracts(assigned.slice(start, start + PAGE_SIZE));
        setTotalPages(Math.ceil(assigned.length / PAGE_SIZE));
        setFilteredTotal(assigned.length);
        setError('');
      } else {
        setError('Failed to load SC assignments');
      }
      setLoading(false);
      return;
    }

    const response = await abstractsApi.getAll(
      page,
      PAGE_SIZE,
      statusFilter as Exclude<typeof statusFilter, 'my_assigned'>,
      rFilter,
      sFilter,
    );

    if (response.data && Array.isArray(response.data)) {
      setAbstracts(response.data);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setFilteredTotal(response.pagination.total);
      }
      setError('');
    } else {
      setError('Failed to load abstracts');
    }
    setLoading(false);
  };

  // Status counts come from a dedicated aggregate endpoint (cheap; no row transfer).
  const fetchStatusCounts = async () => {
    const res = await abstractsApi.getStatusCounts();
    if (res.data) {
      setStatusCounts({
        pending: res.data.pending,
        under_review: res.data.under_review,
        approved: res.data.approved,
        rejected: res.data.rejected,
        more_info_requested: res.data.more_info_requested,
      });
      setTotalAbstracts(res.data.all);
    }
  };

  // Pull a wider slice for client-side search across pages. Capped by the backend.
  const fetchAllAbstracts = async () => {
    const res = await abstractsApi.getAll(1, 100);
    if (res.data && Array.isArray(res.data)) {
      setAllAbstracts(res.data);
    }
  };

  useEffect(() => {
    fetchAbstracts(currentPage, filter, reviewFilter, scoreFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filter, reviewFilter, scoreFilter]);

  useEffect(() => {
    fetchStatusCounts();
    fetchAllAbstracts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      abstractsApi.getMySCAssignments().then((res) => {
        if (res.data && Array.isArray(res.data)) setMyAssignedCount(res.data.length);
      });
    }
  }, [isSuperAdmin]);

  const getStatusBadge = (status: Abstract['status']) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      under_review: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      more_info_requested: 'bg-blue-100 text-blue-800 border-blue-200',
    };

    const labels = {
      pending: 'Pending',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      more_info_requested: 'More Info Requested',
    };

    return (
      <span
        className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const q = search.trim().toLowerCase();
  // Status and review-count filtering are applied server-side.
  // For search, fall back to the wider buffer so it can match across pages.
  const sourceAbstracts = q ? allAbstracts : (abstracts || []);
  const filteredAbstracts = sourceAbstracts.filter((a) => {
    if (q && filter !== 'all' && a.status !== filter) return false;
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.presenterFullName.toLowerCase().includes(q) ||
      a.presenterEmail.toLowerCase().includes(q) ||
      a.subThemeCategory.toLowerCase().includes(q)
    );
  });

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleDelete = async (abstract: Abstract) => {
    if (!confirm(`Delete "${abstract.title}"? This cannot be undone.`)) return;
    setDeletingId(abstract.id);
    const response = await abstractsApi.delete(abstract.id);
    setDeletingId(null);
    if (response.message?.toLowerCase().includes('success') || response.message?.toLowerCase().includes('deleted')) {
      setAbstracts((prev) => prev.filter((a) => a.id !== abstract.id));
    } else {
      alert(response.message || 'Failed to delete abstract');
    }
  };

  const exportToExcel = async () => {
    if (totalAbstracts === 0) {
      alert('No abstracts to export.');
      return;
    }
    setExportLoading(true);
    try {
      // The spreadsheet is rendered server-side; we just download what the
      // backend returns.
      await abstractsApi.exportExcel();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Abstract Review Dashboard</h1>
              <p className="text-gray-500 text-sm">Review and manage submitted abstracts</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({totalAbstracts})
            </button>
            <button
              onClick={() => handleFilterChange('pending')}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({statusCounts.pending})
            </button>
            <button
              onClick={() => handleFilterChange('under_review')}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'under_review'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Under Review ({statusCounts.under_review})
            </button>
            <button
              onClick={() => handleFilterChange('approved')}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved ({statusCounts.approved})
            </button>
            <button
              onClick={() => handleFilterChange('rejected')}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected ({statusCounts.rejected})
            </button>
            <button
              onClick={() => handleFilterChange('more_info_requested')}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'more_info_requested'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              More Info ({statusCounts.more_info_requested})
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => handleFilterChange('my_assigned')}
                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'my_assigned'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                My SC Assignments ({myAssignedCount})
              </button>
            )}
          </div>
          <button
            onClick={exportToExcel}
            disabled={exportLoading || totalAbstracts === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exportLoading ? 'Exporting…' : `Export Excel (${totalAbstracts})`}
          </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[260px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, presenter, or category…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="reviewFilter"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 whitespace-nowrap"
            >
              <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Reviewers per abstract:
            </label>
            <select
              id="reviewFilter"
              value={reviewFilter}
              onChange={(e) => {
                setReviewFilter(e.target.value as typeof reviewFilter);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
                reviewFilter !== 'any'
                  ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
              title="Filter abstracts by how many reviewers have scored them"
            >
              <option value="any">Show all</option>
              <option value="0">No reviews yet (0 reviewers)</option>
              <option value="1">Only 1 reviewer has scored</option>
              <option value="2">2 reviewers have scored</option>
              <option value="admin">Scored by admin (SC review)</option>
            </select>
            {reviewFilter !== 'any' && (
              <button
                onClick={() => {
                  setReviewFilter('any');
                  setCurrentPage(1);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
                title="Clear review filter"
              >
                Clear
              </button>
            )}
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="scoreFilter"
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 whitespace-nowrap"
              >
                <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 15l4-4 4 4 6-6" />
                </svg>
                Average score:
              </label>
              <select
                id="scoreFilter"
                value={scoreFilter}
                onChange={(e) => {
                  setScoreFilter(e.target.value as typeof scoreFilter);
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
                  scoreFilter !== 'any'
                    ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
                title="Filter abstracts by average reviewer score"
              >
                <option value="any">Show all</option>
                <option value="below15">Below 15</option>
                <option value="15to19">15 to 19</option>
                <option value="20plus">20 and above</option>
              </select>
              {scoreFilter !== 'any' && (
                <button
                  onClick={() => {
                    setScoreFilter('any');
                    setCurrentPage(1);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                  title="Clear score filter"
                >
                  Clear
                </button>
              )}
            </div>
          )}
          </div>
          {(q || reviewFilter !== 'any' || scoreFilter !== 'any') && (
            <p className="text-xs text-gray-500 mt-2">
              {filteredAbstracts.length} result{filteredAbstracts.length !== 1 ? 's' : ''}
              {q && <> for &ldquo;{search}&rdquo;</>}
              {reviewFilter !== 'any' && <> · review filter active</>}
              {scoreFilter !== 'any' && <> · score filter active</>}
            </p>
          )}
        </div>

        {/* Abstracts Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading abstracts...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-accent-red">{error}</div>
          ) : filteredAbstracts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No abstracts found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-500 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Title
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Presenter
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Points
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Submitted
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAbstracts.map((abstract: Abstract) => (
                    <tr key={abstract.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium text-gray-900 max-w-[220px] truncate">
                          {abstract.title}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-gray-900">
                          {abstract.presenterFullName}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {abstract.presenterEmail}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[11px] text-gray-600 max-w-[200px] truncate">
                          {abstract.subThemeCategory}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {abstract.scRecommendation === 'accept_oral' ? (
                          <span className="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-100 text-emerald-800 border-emerald-200">
                            Accepted — Oral
                          </span>
                        ) : abstract.scRecommendation === 'accept_poster' ? (
                          <span className="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border bg-teal-100 text-teal-800 border-teal-200">
                            Accepted — Poster
                          </span>
                        ) : abstract.scRecommendation === 'not_accepted' ? (
                          <span className="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border bg-red-100 text-red-800 border-red-200">
                            Not Accepted
                          </span>
                        ) : (
                          getStatusBadge(abstract.status)
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">
                        {(() => {
                          // Super admin: backend embeds averageScore + reviewCount per row.
                          // Staff reviewer: backend embeds myScore (their own totalScore).
                          const adminAvg = abstract.averageScore;
                          const adminCount = abstract.reviewCount ?? 0;
                          const myScore = abstract.myScore;
                          const hasReviewer = isSuperAdmin
                            ? adminAvg != null && adminCount > 0
                            : myScore != null;
                          const hasSC = abstract.points != null && abstract.points > 0;
                          const hasBonus = abstract.equityPoints != null && abstract.equityPoints > 0;
                          if (!hasReviewer && !hasSC && !hasBonus) return <span className="text-gray-400">-</span>;
                          return (
                            <div className="flex flex-col gap-1 min-w-[120px]">
                              {hasReviewer && isSuperAdmin && (
                                <>
                                  <div
                                    className={`inline-flex items-baseline gap-1 px-2 py-0.5 rounded-md border ${TIER_BADGE[scoreTier(adminAvg!)]} w-fit`}
                                  >
                                    <span className="text-xs font-bold leading-none">{adminAvg!.toFixed(1)}</span>
                                    <span className="text-[10px] opacity-70">/30</span>
                                    <span className="text-[9px] opacity-60 ml-0.5">·{adminCount}</span>
                                  </div>
                                  {abstract.reviews && abstract.reviews.length > 0 && (
                                    <div className="flex flex-wrap gap-0.5">
                                      {abstract.reviews.map((r, idx) => (
                                        <span
                                          key={`${r.reviewerEmail}-${idx}`}
                                          title={`${r.reviewerEmail} — ${r.recommendation.replace(/_/g, ' ')}`}
                                          className={`inline-flex items-center gap-0.5 pl-0.5 pr-1 py-0 rounded-full text-[10px] font-medium ${TIER_CHIP[scoreTier(r.totalScore)]}`}
                                        >
                                          <span className="w-3.5 h-3.5 rounded-full bg-white/70 flex items-center justify-center text-[7px] font-bold tracking-tight">
                                            {reviewerInitials(r.reviewerEmail)}
                                          </span>
                                          {r.totalScore}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                              {hasReviewer && !isSuperAdmin && (
                                <div
                                  className={`inline-flex items-baseline gap-1 px-2 py-0.5 rounded-md border ${TIER_BADGE[scoreTier(myScore!)]} w-fit`}
                                >
                                  <span className="text-xs font-bold leading-none">{myScore}</span>
                                  <span className="text-[10px] opacity-70">/30</span>
                                </div>
                              )}
                              {hasSC && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium w-fit">
                                  SC <span className="font-bold">{abstract.points}</span>
                                  <span className="opacity-70">/100</span>
                                </span>
                              )}
                              {hasBonus && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium w-fit">
                                  +{abstract.equityPoints} bonus
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(abstract.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/abstracts/${abstract.id}`}
                            className="inline-block px-2.5 py-1 bg-primary-light text-white text-xs rounded-md hover:bg-[#3da0d4] transition-colors font-medium"
                          >
                            Review
                          </Link>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(abstract)}
                              disabled={deletingId === abstract.id}
                              className="px-2.5 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingId === abstract.id ? '…' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {!loading && !error && filteredTotal > 0 && !q && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTotal)} of {filteredTotal}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ‹ Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (arr[idx - 1] as number) + 1 < p) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '…' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item as number)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          currentPage === item
                            ? 'bg-primary-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
