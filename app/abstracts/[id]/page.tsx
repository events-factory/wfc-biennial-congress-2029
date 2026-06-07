'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { abstractsApi, commentsApi } from '@/lib/api';
import type {
  Abstract,
  AbstractComment,
  ReviewsSummary,
  SCScorePayload,
  BonusPointsPayload,
} from '@/lib/types';
import ChangelogModal from '@/components/ChangelogModal';
import AppLayout from '@/components/AppLayout';

// Section A: 6-criteria scientific merit scoring (max 30, scale 1–5 per criterion)
const REVIEW_CRITERIA = [
  { key: 'relevance',     label: 'Relevance',      max: 5, description: 'Title is relevant to the conference theme and sub-theme' },
  { key: 'objectives',    label: 'Objectives',     max: 5, description: 'Abstract clearly states the research objectives' },
  { key: 'methodology',   label: 'Methodology',    max: 5, description: 'Research methodology is appropriate and described' },
  { key: 'results',       label: 'Results',        max: 5, description: 'Results of analysis are correctly interpreted' },
  { key: 'conclusions',   label: 'Conclusions',    max: 5, description: 'Conclusions and recommendations are sound' },
  { key: 'writingQuality',label: 'Writing Quality',max: 5, description: 'Abstract is free from grammatical and spelling errors' },
] as const;

type ReviewKey = typeof REVIEW_CRITERIA[number]['key'];
type ReviewScores = Record<ReviewKey, number>;

const INITIAL_SCORES: ReviewScores = {
  relevance: 0, objectives: 0, methodology: 0, results: 0, conclusions: 0, writingQuality: 0,
};

// Section B: auto-computed recommendation thresholds (max 30 pts)
function getRecommendation(total: number): { label: string; color: string; bg: string } {
  if (total >= 25) return { label: 'Excellent — Accept for Oral Presentation',          color: 'text-green-800',  bg: 'bg-green-100 border-green-300'  };
  if (total >= 20) return { label: 'Good — Accept for Oral (minor revisions)',           color: 'text-blue-800',   bg: 'bg-blue-100 border-blue-300'    };
  if (total >= 15) return { label: 'Average — Accept for Poster Presentation',           color: 'text-yellow-800', bg: 'bg-yellow-100 border-yellow-300' };
  if (total >= 10) return { label: 'Below Average — Invite resubmission after revision', color: 'text-orange-800', bg: 'bg-orange-100 border-orange-300' };
  if (total > 0)   return { label: 'Very Poor — Reject',                                 color: 'text-red-800',    bg: 'bg-red-100 border-red-300'       };
  return             { label: '—',                                                       color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200'      };
}

// Section B (SC only): 9-criteria detailed quality scoring (max 100)
const SC_CRITERIA = [
  { key: 'titleClarity'     as const, label: 'Title Clarity',     max: 5  },
  { key: 'structuredFormat' as const, label: 'Structured Format', max: 10 },
  { key: 'relevance'        as const, label: 'Relevance',         max: 15 },
  { key: 'methodology'      as const, label: 'Methodology',       max: 20 },
  { key: 'dataQuality'      as const, label: 'Data Quality',      max: 15 },
  { key: 'conclusions'      as const, label: 'Conclusions',       max: 10 },
  { key: 'originality'      as const, label: 'Originality',       max: 10 },
  { key: 'contribution'     as const, label: 'Contribution',      max: 10 },
  { key: 'overallMerit'     as const, label: 'Overall Merit',     max: 5  },
];

const INITIAL_SC_SCORES: SCScorePayload = {
  titleClarity: 0, structuredFormat: 0, relevance: 0, methodology: 0,
  dataQuality: 0, conclusions: 0, originality: 0, contribution: 0, overallMerit: 0,
};

// Sections C & D: Bonus point categories
const GEO_BONUS_CRITERIA = [
  { key: 'geoBonusUnderrepresentedRegion' as const, label: 'Underrepresented African Region',   max: 5 },
  { key: 'geoBonusLMIC'                   as const, label: 'Low/Middle-Income Country',          max: 3 },
  { key: 'geoBonusFirstTimeInstitution'   as const, label: 'First-time Submitting Institution',  max: 2 },
];

const EQUITY_BONUS_CRITERIA = [
  { key: 'equityBonusUnderrepresentedGender' as const, label: 'Lead Author Underrepresented Gender', max: 5 },
  { key: 'equityBonusMemberUniversity'       as const, label: 'Member University (COMS-A)',           max: 5 },
  { key: 'equityBonusPartnerInstitution'     as const, label: 'Associate Partner Institution',        max: 3 },
];

const INITIAL_BONUS: BonusPointsPayload = {
  geoBonusUnderrepresentedRegion: 0,
  geoBonusLMIC: 0,
  geoBonusFirstTimeInstitution: 0,
  equityBonusUnderrepresentedGender: 0,
  equityBonusMemberUniversity: 0,
  equityBonusPartnerInstitution: 0,
  note: '',
};

export default function AbstractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const abstractId = parseInt(params.id as string);

  const [abstract, setAbstract] = useState<Abstract | null>(null);
  const [comments, setComments] = useState<AbstractComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [changelogModalOpen, setChangelogModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveNote, setApproveNote] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ status: 'rejected' | 'more_info_requested'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Right-column scoring tabs. Staff only see Section A so tabs are hidden for them.
  type ScoreTab = 'A' | 'B' | 'BONUS';
  const [activeTab, setActiveTab] = useState<ScoreTab>('A');
  // Left-column top-level tabs: Abstract details | Reviews summary | Comments.
  // Staff don't see the Reviews tab.
  type LeftTab = 'ABSTRACT' | 'REVIEWS' | 'COMMENTS';
  const [leftTab, setLeftTab] = useState<LeftTab>('ABSTRACT');

  // Section A: review form state
  const [reviewScores, setReviewScores] = useState<ReviewScores>({ ...INITIAL_SCORES });
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<ReviewsSummary | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Section B (SC): detailed quality scoring state
  const [scScores, setScScores] = useState<SCScorePayload>({ ...INITIAL_SC_SCORES });
  const [scComment, setScComment] = useState('');
  const [scLoading, setScLoading] = useState(false);
  const [scTotalDisplay, setScTotalDisplay] = useState<number | null>(null);

  // Sections C & D: bonus points state
  const [bonusData, setBonusData] = useState<BonusPointsPayload>({ ...INITIAL_BONUS });
  const [bonusLoading, setBonusLoading] = useState(false);

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
    const superAdmin = userData.isSuperAdmin || false;
    setIsSuperAdmin(superAdmin);
    fetchAbstractDetails();
    fetchComments();
    fetchReviews();
    if (superAdmin) {
      // Restore from localStorage immediately, then try GET endpoint
      const cached = localStorage.getItem(`sc-score-${abstractId}`);
      if (cached) setScTotalDisplay(parseInt(cached));
      fetchSCScore();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abstractId]);

  const fetchAbstractDetails = async () => {
    setLoading(true);
    const response = await abstractsApi.getById(abstractId);
    if (response.data) {
      setAbstract(response.data);
      setError('');
    } else {
      setError('Abstract not found');
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const response = await commentsApi.getByAbstractId(abstractId);
    if (response.data && Array.isArray(response.data)) {
      setComments(response.data);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    const response = await abstractsApi.getReviews(abstractId);
    if (response.data) {
      setReviewSummary(response.data);
    }
    setReviewsLoading(false);
  };

  const persistSCTotal = (total: number) => {
    setScTotalDisplay(total);
    localStorage.setItem(`sc-score-${abstractId}`, String(total));
  };

  const fetchSCScore = async () => {
    const response = await abstractsApi.getSCScore(abstractId);
    if (response.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = response.data as any;
      const total = d.scientificMeritTotal ?? d.totalScore ?? (
        d.titleClarity != null
          ? d.titleClarity + d.structuredFormat + d.relevance + d.methodology +
            d.dataQuality + d.conclusions + d.originality + d.contribution + d.overallMerit
          : null
      );
      if (total != null && total > 0) persistSCTotal(total);
    }
  };

  const handleStatusUpdate = (status: 'approved' | 'rejected' | 'more_info_requested') => {
    if (!abstract) return;
    if (status === 'approved') {
      setApproveModalOpen(true);
      return;
    }
    const confirmMessages = {
      rejected: 'Are you sure you want to reject this abstract?',
      more_info_requested: 'Are you sure you want to request more information?',
    };
    setConfirmModal({ status, message: confirmMessages[status] });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { status } = confirmModal;
    setConfirmModal(null);
    setActionLoading(true);
    const response =
      status === 'rejected'
        ? await abstractsApi.reject(abstractId)
        : await abstractsApi.requestMoreInfo(abstractId);
    if (response.data) {
      setAbstract(response.data);
      showToast('success', `Abstract ${status.replace(/_/g, ' ')} successfully.`);
    } else {
      showToast('error', 'Failed to update abstract status.');
    }
    setActionLoading(false);
  };

  const handleApproveSubmit = async () => {
    if (!abstract) return;
    setActionLoading(true);
    const response = await abstractsApi.approve(abstractId, approveNote || undefined);
    if (response.data) {
      setAbstract(response.data);
      showToast('success', 'Abstract approved successfully.');
    } else {
      showToast('error', 'Failed to approve abstract.');
    }
    setApproveModalOpen(false);
    setApproveNote('');
    setActionLoading(false);
  };

  const handleSubmitReview = async () => {
    setReviewLoading(true);
    const response = await abstractsApi.submitReview(abstractId, {
      ...reviewScores,
      comment: reviewComment || undefined,
    });
    if (response.data) {
      setReviewScores({ ...INITIAL_SCORES });
      setReviewComment('');
      await fetchReviews();
      showToast('success', 'Review submitted successfully.');
    } else {
      showToast('error', 'Failed to submit review.');
    }
    setReviewLoading(false);
  };

  const handleSubmitSCScores = async () => {
    // Capture live total before any reset
    const liveTotal = Object.entries(scScores)
      .filter(([k]) => k !== 'comment')
      .reduce((sum, [, v]) => sum + (v as number), 0);

    setScLoading(true);
    const response = await abstractsApi.submitSCScores(abstractId, {
      ...scScores,
      comment: scComment || undefined,
    });
    if (response.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = response.data as any;
      const total = d.scientificMeritTotal ?? liveTotal;
      if (total > 0) persistSCTotal(total);
      setAbstract(prev => prev ? { ...prev, points: total } : prev);
      setScScores({ ...INITIAL_SC_SCORES });
      setScComment('');
      showToast('success', 'SC scores submitted successfully.');
    } else {
      const msg = typeof response.message === 'string' ? response.message : 'Failed to submit SC scores.';
      showToast('error', msg);
      if (liveTotal > 0) persistSCTotal(liveTotal);
      else fetchSCScore();
    }
    setScLoading(false);
  };

  const handleUpdateBonusPoints = async () => {
    setBonusLoading(true);
    const response = await abstractsApi.updateBonusPoints(abstractId, {
      ...bonusData,
      note: bonusData.note || undefined,
    });
    if (response.data) {
      setAbstract(response.data);
      showToast('success', 'Bonus points updated successfully.');
    } else {
      showToast('error', 'Failed to update bonus points.');
    }
    setBonusLoading(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentLoading(true);
    const response = await commentsApi.create(abstractId, newComment);
    if (response.data) {
      setComments([...comments, response.data]);
      setNewComment('');
    } else {
      showToast('error', 'Failed to add comment.');
    }
    setCommentLoading(false);
  };

  const getStatusBadge = (status: Abstract['status']) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      under_review: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      more_info_requested: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    const labels = {
      pending: 'Pending Review',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      more_info_requested: 'More Information Requested',
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Live totals for the review form
  const reviewTotal = Object.values(reviewScores).reduce((sum, v) => sum + v, 0);
  const reviewRec = getRecommendation(reviewTotal);
  const allScored = REVIEW_CRITERIA.every(c => reviewScores[c.key] > 0);

  // Compute average and threshold client-side from reviews array
  const avgMerit = reviewSummary && reviewSummary.reviews.length > 0
    ? reviewSummary.reviews.reduce((sum, r) => sum + r.totalScore, 0) / reviewSummary.reviews.length
    : 0;
  const meetsThreshold = avgMerit >= 21;

  const bonusTotal =
    bonusData.geoBonusUnderrepresentedRegion +
    bonusData.geoBonusLMIC +
    bonusData.geoBonusFirstTimeInstitution +
    bonusData.equityBonusUnderrepresentedGender +
    bonusData.equityBonusMemberUniversity +
    bonusData.equityBonusPartnerInstitution;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-600">Loading abstract details...</div>
        </div>
      </AppLayout>
    );
  }

  if (error || !abstract) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center px-4 py-20">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <div className="text-accent-red mb-4">{error || 'Abstract not found'}</div>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-start gap-3 min-w-72 max-w-sm px-4 py-3 rounded-xl shadow-lg border animate-fade-in"
          style={{ background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2', borderColor: toast.type === 'success' ? '#bbf7d0' : '#fecaca' }}>
          <span className={`mt-0.5 shrink-0 text-lg ${toast.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-green-800' : 'text-red-700'}`}>{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Confirm action modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmModal(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <p className="text-gray-800 font-medium mb-5">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-accent-red text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="py-8 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Status and Actions */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Review Abstract</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(abstract.status)}
                  {reviewSummary && reviewSummary.reviewCount > 0 && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${meetsThreshold ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {isSuperAdmin ? 'Reviewers' : 'Your score'}:&nbsp;
                      <span className="font-black">{Math.round(avgMerit)}</span>
                      <span className="font-normal opacity-60">/30</span>
                      {isSuperAdmin && (
                        <span className="text-xs opacity-60 ml-1">({reviewSummary.reviewCount})</span>
                      )}
                    </span>
                  )}
                  {scTotalDisplay != null && scTotalDisplay > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border bg-blue-50 text-blue-800 border-blue-200">
                      SC:&nbsp;<span className="font-black">{scTotalDisplay}</span>
                      <span className="font-normal opacity-60">/100</span>
                    </span>
                  )}
                  {abstract.equityPoints != null && abstract.equityPoints > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border bg-purple-50 text-purple-800 border-purple-200">
                      Bonus:&nbsp;<span className="font-black">+{abstract.equityPoints}</span>
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    Submitted on {new Date(abstract.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {isSuperAdmin && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('approved')}
                      disabled={actionLoading || abstract.status === 'approved'}
                      className="px-3 py-1.5 bg-accent-green text-white text-sm rounded-md hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('rejected')}
                      disabled={actionLoading || abstract.status === 'rejected'}
                      className="px-3 py-1.5 bg-accent-red text-white text-sm rounded-md hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleStatusUpdate('more_info_requested')}
                  disabled={actionLoading || abstract.status === 'more_info_requested'}
                  className="px-3 py-1.5 bg-primary-light text-white text-sm rounded-md hover:bg-[#3da0d4] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Request More Info
                </button>
                <button
                  onClick={() => setChangelogModalOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors font-medium"
                  title="View Change History"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </button>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Abstract Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Top-level tabs: Abstract | Reviews | Comments */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex border-b border-gray-200 bg-gray-50/60">
                  <button
                    onClick={() => setLeftTab('ABSTRACT')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                      leftTab === 'ABSTRACT'
                        ? 'bg-white text-[#1a3a5c] border-b-2 border-[#1a3a5c] -mb-px'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Abstract
                  </button>
                  <button
                    onClick={() => setLeftTab('REVIEWS')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                      leftTab === 'REVIEWS'
                        ? 'bg-white text-[#1a3a5c] border-b-2 border-[#1a3a5c] -mb-px'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {isSuperAdmin ? 'Reviews Summary' : 'My Review'}
                    {reviewSummary && reviewSummary.reviewCount > 0 && (
                      <span className="ml-2 text-xs text-gray-400">({reviewSummary.reviewCount})</span>
                    )}
                  </button>
                  <button
                    onClick={() => setLeftTab('COMMENTS')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                      leftTab === 'COMMENTS'
                        ? 'bg-white text-[#1a3a5c] border-b-2 border-[#1a3a5c] -mb-px'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Comments
                    {comments && comments.length > 0 && (
                      <span className="ml-2 text-xs text-gray-400">({comments.length})</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Abstract tab body */}
              {leftTab === 'ABSTRACT' && (
                <>
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Abstract Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                    <p className="text-gray-900">{abstract.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sub-Theme Category</label>
                    <p className="text-gray-900">{abstract.subThemeCategory}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type of Presentation</label>
                    <p className="text-gray-900">{abstract.presentationType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Author Information</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{abstract.authorInformation}</p>
                  </div>
                </div>
              </div>

              {/* Presenter Details — Super Admin only */}
              {isSuperAdmin && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Presenter Details</h2>
                  <div className="space-y-3">
                    {[
                      { label: 'Name:',                value: abstract.presenterFullName },
                      { label: 'Email:',               value: abstract.presenterEmail },
                      { label: 'Phone:',               value: abstract.presenterPhone },
                      { label: 'Institution:',         value: abstract.presenterInstitution },
                      { label: 'Country:',             value: abstract.presenterCountry },
                      { label: 'Gender:',              value: abstract.presenterGender },
                      { label: 'Professional Status:', value: abstract.professionalStatus },
                    ].map(({ label, value }) => (
                      <div key={label} className="grid grid-cols-3 gap-2">
                        <span className="text-sm font-semibold text-gray-700">{label}</span>
                        <span className="col-span-2 text-gray-900">{value}</span>
                      </div>
                    ))}
                    {abstract.deanContact && (
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm font-semibold text-gray-700">Dean Contact:</span>
                        <span className="col-span-2 text-gray-900 whitespace-pre-wrap">{abstract.deanContact}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Abstract Body */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Abstract Body</h2>
                <div
                  className="prose prose-sm max-w-none text-gray-900"
                  dangerouslySetInnerHTML={{ __html: abstract.abstractBody }}
                />
              </div>
                </>
              )}

              {/* Reviews tab body. Backend filters: super admin sees all reviews,
                  staff see only their own. */}
              {leftTab === 'REVIEWS' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  {reviewsLoading ? (
                    <p className="text-center text-sm text-gray-500 py-4">Loading reviews...</p>
                  ) : reviewSummary && (reviewSummary.reviewCount > 0 || reviewSummary.scReviewCount) ? (
                    <>
                      {reviewSummary.reviewCount > 0 && (
                      <>
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <p className="text-sm text-gray-500">
                            {reviewSummary.reviewCount} review{reviewSummary.reviewCount !== 1 ? 's' : ''}
                          </p>
                          {(() => {
                            const avg = Math.round(avgMerit);
                            const rec = getRecommendation(avg);
                            return (
                              <span className={`inline-block mt-1 px-2.5 py-1 rounded text-xs font-semibold border ${rec.bg} ${rec.color}`}>
                                {rec.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-right">
                          <p className={`text-4xl font-black leading-none ${meetsThreshold ? 'text-green-700' : 'text-red-600'}`}>
                            {Math.round(avgMerit)}
                            <span className="text-base font-semibold opacity-60">/30</span>
                          </p>
                          <p className={`text-xs mt-1 font-medium ${meetsThreshold ? 'text-green-600' : 'text-red-500'}`}>
                            {meetsThreshold ? 'Meets threshold' : 'Below minimum (21)'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {reviewSummary.reviews.map((r, i) => (
                          <div key={r.id} className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-700 font-semibold">
                                {isSuperAdmin ? `Reviewer ${i + 1}` : 'Your Review'}
                              </span>
                              <span className="text-base font-bold text-[#1a3a5c]">{r.totalScore}/30</span>
                            </div>
                            {r.comment && (
                              <p className="text-sm text-gray-700 italic whitespace-pre-wrap">
                                &ldquo;{r.comment}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      </>
                      )}

                      {/* Scientific Committee (Phase 2) reviews — scored out of 100. */}
                      {reviewSummary.scReviewCount ? (
                        <div className={reviewSummary.reviewCount > 0 ? 'mt-6 border-t pt-5' : ''}>
                          <div className="flex items-center justify-between mb-5">
                            <p className="text-sm text-gray-500">
                              {reviewSummary.scReviewCount} SC review{reviewSummary.scReviewCount !== 1 ? 's' : ''}
                            </p>
                            <p className="text-4xl font-black leading-none text-blue-700">
                              {reviewSummary.scAverageScore ?? '—'}
                              <span className="text-base font-semibold opacity-60">/100</span>
                            </p>
                          </div>
                          <div className="space-y-3">
                            {reviewSummary.scReviews!.map((r, i) => (
                              <div key={`${r.reviewerEmail}-${i}`} className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-gray-700 font-semibold">
                                    {isSuperAdmin ? r.reviewerEmail : 'Your SC Review'}
                                  </span>
                                  <span className="text-base font-bold text-blue-700">{r.scientificMeritTotal}/100</span>
                                </div>
                                <span className="inline-block text-xs font-medium text-gray-500 capitalize">
                                  {r.recommendation.replace(/_/g, ' ')}
                                </span>
                                {r.comment && (
                                  <p className="text-sm text-gray-700 italic whitespace-pre-wrap mt-1">
                                    &ldquo;{r.comment}&rdquo;
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Bonus points breakdown (Sections C + D). */}
                      {abstract.equityPoints != null && abstract.equityPoints > 0 && (
                        <div className="mt-6 border-t pt-4">
                          <div className="flex items-baseline justify-between mb-2">
                            <span className="text-sm text-gray-600">Bonus (Sections C + D)</span>
                            <span className="text-2xl font-bold text-purple-700">
                              +{abstract.equityPoints}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 space-y-0.5">
                            {abstract.geoBonusUnderrepresentedRegion ? <div>Underrepresented region: +{abstract.geoBonusUnderrepresentedRegion}</div> : null}
                            {abstract.geoBonusLMIC ? <div>LMIC: +{abstract.geoBonusLMIC}</div> : null}
                            {abstract.geoBonusFirstTimeInstitution ? <div>First-time institution: +{abstract.geoBonusFirstTimeInstitution}</div> : null}
                            {abstract.equityBonusUnderrepresentedGender ? <div>Underrepresented gender: +{abstract.equityBonusUnderrepresentedGender}</div> : null}
                            {abstract.equityBonusMemberUniversity ? <div>Member university: +{abstract.equityBonusMemberUniversity}</div> : null}
                            {abstract.equityBonusPartnerInstitution ? <div>Partner institution: +{abstract.equityBonusPartnerInstitution}</div> : null}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-center text-sm text-gray-500 py-4">No reviews submitted yet.</p>
                  )}
                </div>
              )}

              {/* Comments tab body */}
              {leftTab === 'COMMENTS' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <form onSubmit={handleAddComment} className="mb-6">
                    <textarea
                      rows={3}
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2 text-sm"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={commentLoading || !newComment.trim()}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {commentLoading ? 'Adding...' : 'Add Comment'}
                    </button>
                  </form>

                  <div className="space-y-3">
                    {!comments || comments.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No comments yet</p>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} className="border-l-4 border-primary-500 pl-3 py-2 bg-gray-50/50 rounded-r">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-800">{comment.submittedBy}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right column — sticky scoring forms with tabs (super admin only) */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-6 space-y-4">

              {/* Tab nav — only when there's more than one section to choose. */}
              {isSuperAdmin && (
                <div className="bg-white rounded-lg shadow-md p-1 flex gap-1">
                  {([
                    { id: 'A',     label: 'Section A', sub: 'Merit · 30' },
                    { id: 'B',     label: 'Section B', sub: 'SC · 100' },
                    { id: 'BONUS', label: 'Bonus',     sub: 'C+D · 23' },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex-1 px-2 py-2 rounded-md text-xs font-semibold transition-colors ${
                        activeTab === t.id
                          ? 'bg-[#1a3a5c] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div>{t.label}</div>
                      <div className={`text-[10px] mt-0.5 font-normal ${activeTab === t.id ? 'opacity-80' : 'opacity-60'}`}>
                        {t.sub}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Section A: Scientific Merit Review Form */}
              {(!isSuperAdmin || activeTab === 'A') && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Section A — Scientific Merit</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Score each criterion (1–5). Total: 30 pts.</p>
                </div>

                <div className="space-y-3">
                  {REVIEW_CRITERIA.map(c => (
                    <div key={c.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">{c.label}</span>
                        <span className="text-xs font-mono text-gray-500">
                          <span className={reviewScores[c.key] > 0 ? 'text-[#1a3a5c] font-bold' : ''}>
                            {reviewScores[c.key]}
                          </span>
                          /{c.max}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={c.max}
                        value={reviewScores[c.key]}
                        onChange={e =>
                          setReviewScores(prev => ({ ...prev, [c.key]: parseInt(e.target.value) }))
                        }
                        className="w-full h-1.5 rounded-full accent-[#1a3a5c] cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* Live score + Section B recommendation */}
                <div className={`mt-4 rounded-lg border px-3 py-2.5 flex items-center justify-between ${reviewRec.bg}`}>
                  <div>
                    <p className={`text-xs font-semibold ${reviewRec.color}`}>Recommendation</p>
                    <p className={`text-xs mt-0.5 ${reviewRec.color}`}>{reviewRec.label}</p>
                  </div>
                  <p className={`text-2xl font-black ${reviewRec.color}`}>
                    {reviewTotal}
                    <span className="text-sm font-semibold opacity-60">/30</span>
                  </p>
                </div>

                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Review comment (optional)..."
                  className="mt-3 w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#1a3a5c] focus:border-transparent resize-none"
                />

                <button
                  onClick={handleSubmitReview}
                  disabled={reviewLoading || !allScored}
                  className="mt-3 w-full px-4 py-2 bg-[#1a3a5c] text-white rounded-lg hover:bg-[#25527f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </button>
                {!allScored && (
                  <p className="mt-1.5 text-xs text-amber-600 text-center">
                    Score all criteria to submit
                  </p>
                )}
              </div>
              )}

              {/* Section B: SC Detailed Quality Scoring — Super Admin only */}
              {isSuperAdmin && activeTab === 'B' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Section B — SC Quality Review</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Scientific Committee only. Total: 100 pts.</p>
                    </div>
                    {scTotalDisplay != null && scTotalDisplay > 0 && (
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs text-gray-500 mb-0.5">Submitted</p>
                        <p className="text-2xl font-black text-[#1a3a5c] leading-none">
                          {scTotalDisplay}
                          <span className="text-sm font-semibold opacity-50">/100</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {SC_CRITERIA.map(c => {
                      const val = scScores[c.key];
                      return (
                        <div key={c.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700">{c.label}</span>
                            <span className="text-xs font-mono text-gray-500">
                              <span className={val > 0 ? 'text-[#1a3a5c] font-bold' : ''}>{val}</span>/{c.max}
                            </span>
                          </div>
                          <input
                            type="range" min={0} max={c.max} value={val}
                            onChange={e => setScScores(prev => ({ ...prev, [c.key]: parseInt(e.target.value) }))}
                            className="w-full h-1.5 rounded-full accent-[#1a3a5c] cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const scTotal = Object.entries(scScores)
                      .filter(([k]) => k !== 'comment')
                      .reduce((sum, [, v]) => sum + (v as number), 0);
                    const rec = getRecommendation(scTotal >= 85 ? 25 : scTotal >= 70 ? 20 : scTotal >= 50 ? 15 : scTotal >= 35 ? 10 : scTotal > 0 ? 5 : 0);
                    return (
                      <div className={`mt-4 rounded-lg border px-3 py-2.5 flex items-center justify-between ${rec.bg}`}>
                        <p className={`text-xs font-semibold ${rec.color}`}>SC Total</p>
                        <p className={`text-2xl font-black ${rec.color}`}>
                          {scTotal}<span className="text-sm font-semibold opacity-60">/100</span>
                        </p>
                      </div>
                    );
                  })()}
                  <textarea
                    rows={2} value={scComment}
                    onChange={e => setScComment(e.target.value)}
                    placeholder="SC comment (optional)..."
                    className="mt-3 w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#1a3a5c] focus:border-transparent resize-none"
                  />
                  <button
                    onClick={handleSubmitSCScores}
                    disabled={scLoading}
                    className="mt-3 w-full px-4 py-2 bg-[#1a3a5c] text-white rounded-lg hover:bg-[#25527f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {scLoading ? 'Submitting...' : 'Submit SC Scores'}
                  </button>
                </div>
              )}

              {/* Sections C & D: Bonus Points — Super Admin only */}
              {isSuperAdmin && activeTab === 'BONUS' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Sections C & D — Bonus Points</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Super admin only.</p>
                  </div>

                  {/* Section C: Geographical */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                      Section C — Geographical (max 10)
                    </p>
                    {GEO_BONUS_CRITERIA.map(b => (
                      <div key={b.key} className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700">{b.label}</span>
                          <span className="text-xs font-mono font-bold text-[#1a3a5c]">
                            {bonusData[b.key]}/{b.max}
                          </span>
                        </div>
                        <input
                          type="range" min={0} max={b.max} value={bonusData[b.key]}
                          onChange={e => setBonusData(prev => ({ ...prev, [b.key]: parseInt(e.target.value) }))}
                          className="w-full h-1.5 rounded-full accent-purple-600 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Section D: Equity & Membership */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                      Section D — Equity & Membership (max 13)
                    </p>
                    {EQUITY_BONUS_CRITERIA.map(b => (
                      <div key={b.key} className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700">{b.label}</span>
                          <span className="text-xs font-mono font-bold text-[#1a3a5c]">
                            {bonusData[b.key]}/{b.max}
                          </span>
                        </div>
                        <input
                          type="range" min={0} max={b.max} value={bonusData[b.key]}
                          onChange={e => setBonusData(prev => ({ ...prev, [b.key]: parseInt(e.target.value) }))}
                          className="w-full h-1.5 rounded-full accent-purple-600 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Bonus total */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-purple-700">Total Bonus</span>
                    <span className="text-xl font-black text-purple-700">
                      {bonusTotal}<span className="text-sm font-semibold opacity-60">/23</span>
                    </span>
                  </div>

                  <textarea
                    rows={2} value={bonusData.note || ''}
                    onChange={e => setBonusData(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Note (optional)..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none mb-3"
                  />
                  <button
                    onClick={handleUpdateBonusPoints}
                    disabled={bonusLoading}
                    className="w-full px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {bonusLoading ? 'Saving...' : 'Save Bonus Points'}
                  </button>
                </div>
              )}

              </div>
            </div>
          </div>


          <ChangelogModal
            abstractId={abstractId}
            isOpen={changelogModalOpen}
            onClose={() => setChangelogModalOpen(false)}
          />

          {/* Approve Modal */}
          {approveModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={() => setApproveModalOpen(false)}
              />
              <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800">Confirm Approval</h2>
                  {reviewSummary && reviewSummary.reviewCount > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Avg. scientific merit:{' '}
                      <strong>{Math.round(avgMerit)}/30</strong>
                      {' '}— {getRecommendation(Math.round(avgMerit)).label}
                    </p>
                  )}
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Approval Note <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={approveNote}
                    onChange={e => setApproveNote(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="Add any notes about this approval decision..."
                  />
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex gap-3 bg-gray-50 rounded-b-xl">
                  <button
                    onClick={handleApproveSubmit}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-accent-green text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                  >
                    {actionLoading ? 'Approving...' : 'Confirm Approval'}
                  </button>
                  <button
                    onClick={() => setApproveModalOpen(false)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
