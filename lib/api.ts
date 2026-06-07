import {
  User,
  Abstract,
  AbstractComment,
  AbstractCoauthor,
  AbstractHistory,
  Changelog,
  ApiResponse,
  StaffMember,
  StaffTopicAssignment,
  ScientificReviewPayload,
  ScientificReview,
  ReviewsSummary,
  SCScorePayload,
  BonusPointsPayload,
} from './types';
import { mockAbstracts, mockStatusCounts, nextMockId } from './mockAbstracts';

// Use local proxy to avoid CORS issues
const API_BASE_URL = '/api/proxy';

// ---------------------------------------------------------------------------
// Mock abstracts toggle
//
// The abstract backend currently returns the previous event's abstracts (it is
// scoped by tenant/account, not by an event code). Until the WFC 2029 event is
// provisioned there, abstract reads/writes are served from an in-memory mock.
// Set NEXT_PUBLIC_USE_MOCK_ABSTRACTS=false to use the live backend again.
// ---------------------------------------------------------------------------
const USE_MOCK_ABSTRACTS =
  process.env.NEXT_PUBLIC_USE_MOCK_ABSTRACTS !== 'false';

function mockOk<T>(
  data: T,
  pagination?: ApiResponse<T>['pagination'],
): ApiResponse<T> {
  return { message: 'OK (mock data)', data, ...(pagination ? { pagination } : {}) };
}

function currentUserEmail(): string {
  if (typeof window === 'undefined') return 'mock@wfc2029.rw';
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.email || 'mock@wfc2029.rw';
  } catch {
    return 'mock@wfc2029.rw';
  }
}

function mockSetStatus(
  id: number,
  status: Abstract['status'],
  note?: string,
  points?: number,
): ApiResponse<Abstract> {
  const a = mockAbstracts.find((x) => x.id === id);
  if (a) {
    a.status = status;
    if (note !== undefined) a.reviewNote = note;
    if (points !== undefined) a.points = points;
    a.reviewedBy = currentUserEmail();
    a.reviewedAt = new Date().toISOString();
    a.updatedAt = new Date().toISOString();
  }
  return mockOk<Abstract>((a as Abstract) ?? ({ id } as Abstract));
}

// Helper function for API requests
// Wipes all auth-related state from localStorage. Call before storing a new
// session (login/register) and when a session expires.
export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  // Drop any stale per-abstract scratch keys so a different user can't see them.
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sc-score-')) {
      localStorage.removeItem(key);
    }
  }
  // Reset the landing-page welcome toast so a fresh login is announced again.
  sessionStorage.removeItem('welcome-toast-shown');
}

// Endpoints that legitimately return 401 for "wrong credentials" — we must NOT
// treat those as session expiry.
const AUTH_ENTRY_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

let sessionExpiredFired = false;
function fireSessionExpired() {
  if (typeof window === 'undefined') return;
  if (sessionExpiredFired) return; // de-dupe across concurrent failing requests
  sessionExpiredFired = true;
  clearSession();
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
}

// Reset the de-dupe flag once the user navigates back to login.
if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-resumed', () => {
    sessionExpiredFired = false;
  });
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // 401 with a token in flight → expired/invalid session. Skip auth-entry
      // endpoints so a wrong-password 401 doesn't fire the modal.
      const isAuthEntry = AUTH_ENTRY_ENDPOINTS.has(endpoint.split('?')[0]);
      if (response.status === 401 && token && !isAuthEntry) {
        fireSessionExpired();
      }
      return {
        message: data.message || 'Request failed',
        data: data.data as T,
      };
    }

    return {
      message: data.message,
      data: data.data as T,
      pagination: data.pagination,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Network error',
      data: {} as T,
    };
  }
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    return apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    companyName?: string;
    address?: string;
    city?: string;
    country?: string;
    eventName?: string;
    expectedAttendees?: number;
    neededServices?: string;
    comments?: string;
    profilePicture?: string;
  }) => {
    return apiRequest<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getProfile: async () => {
    return apiRequest<User>('/auth/profile', {
      method: 'GET',
    });
  },

  updateProfile: async (userData: Partial<User>) => {
    return apiRequest<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  inviteStaff: async (staffData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    return apiRequest<User>('/auth/invite-staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  },

  logout: () => {
    clearSession();
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  forgotPassword: async (email: string) => {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token: string, newPassword: string) => {
    return apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  // Staff Management APIs (Super Admin only)
  getAllStaff: async (page?: number, limit?: number, search?: string) => {
    const params = new URLSearchParams();
    if (page !== undefined) params.set('page', String(page));
    if (limit !== undefined) params.set('limit', String(limit));
    if (search && search.trim()) params.set('search', search.trim());
    const qs = params.toString();
    return apiRequest<StaffMember[]>(`/auth/staff${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  getStaffTopics: async (userId: number) => {
    console.log(`Fetching topics for staff ID: ${userId}`);
    return apiRequest<StaffTopicAssignment[]>(`/auth/staff/${userId}/topics`, {
      method: 'GET',
    });
  },

  assignStaffTopic: async (userId: number, topic: string) => {
    console.log(`API call: Assigning topic "${topic}" to user ${userId}`);
    const result = await apiRequest<StaffTopicAssignment>(
      `/auth/staff/${userId}/topics`,
      {
        method: 'POST',
        body: JSON.stringify({ topic }),
      }
    );
    console.log('assignStaffTopic result:', result);
    if (!result.data) {
      throw new Error(result.message || 'Failed to assign topic');
    }
    return result;
  },

  removeStaffTopic: async (userId: number, topic: string) => {
    // URL-encode the topic name for special characters
    const encodedTopic = encodeURIComponent(topic);
    console.log(`API call: Removing topic "${topic}" (encoded: "${encodedTopic}") from user ${userId}`);
    const result = await apiRequest<{ message: string }>(
      `/auth/staff/${userId}/topics/${encodedTopic}`,
      {
        method: 'DELETE',
      }
    );
    console.log('removeStaffTopic result:', result);
    // Check if the operation failed
    if (result.message && !result.message.includes('removed') && !result.message.includes('success')) {
      throw new Error(result.message || 'Failed to remove topic');
    }
    return result;
  },
};

// Abstracts API
export const abstractsApi = {
  create: async (
    abstractData: Omit<
      Abstract,
      | 'id'
      | 'submittedBy'
      | 'status'
      | 'createdAt'
      | 'updatedAt'
      | 'reviewNote'
      | 'reviewedBy'
      | 'reviewedAt'
    >,
  ) => {
    if (USE_MOCK_ABSTRACTS) {
      const abstract: Abstract = {
        ...(abstractData as unknown as Abstract),
        id: nextMockId(),
        submittedBy: currentUserEmail(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockAbstracts.unshift(abstract);
      return mockOk<Abstract>(abstract);
    }
    return apiRequest<Abstract>('/abstracts', {
      method: 'POST',
      body: JSON.stringify(abstractData),
    });
  },

  getAll: async (
    page = 1,
    limit = 25,
    status?: string,
    reviewFilter?: string,
    scoreFilter?: string,
  ) => {
    if (USE_MOCK_ABSTRACTS) {
      let rows = [...mockAbstracts];
      if (status && status !== 'all') rows = rows.filter((a) => a.status === status);
      const total = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      return mockOk<Abstract[]>(rows.slice(start, start + limit), {
        page,
        limit,
        total,
        totalPages,
      });
    }
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (status && status !== 'all') params.set('status', status);
    if (reviewFilter && reviewFilter !== 'any') params.set('reviewFilter', reviewFilter);
    if (scoreFilter && scoreFilter !== 'any') params.set('scoreFilter', scoreFilter);
    return apiRequest<Abstract[]>(`/abstracts?${params.toString()}`, {
      method: 'GET',
    });
  },

  getById: async (id: number) => {
    if (USE_MOCK_ABSTRACTS) {
      const found = mockAbstracts.find((a) => a.id === id);
      return found
        ? mockOk<Abstract>(found)
        : { message: 'Abstract not found', data: undefined as unknown as Abstract };
    }
    return apiRequest<Abstract>(`/abstracts/${id}`, {
      method: 'GET',
    });
  },

  update: async (id: number, abstractData: Partial<Abstract>) => {
    if (USE_MOCK_ABSTRACTS) {
      const a = mockAbstracts.find((x) => x.id === id);
      if (a) Object.assign(a, abstractData, { updatedAt: new Date().toISOString() });
      return mockOk<Abstract>((a as Abstract) ?? (abstractData as Abstract));
    }
    return apiRequest<Abstract>(`/abstracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(abstractData),
    });
  },

  delete: async (id: number) => {
    if (USE_MOCK_ABSTRACTS) {
      const i = mockAbstracts.findIndex((a) => a.id === id);
      if (i >= 0) mockAbstracts.splice(i, 1);
      return mockOk<void>(undefined as unknown as void);
    }
    return apiRequest<void>(`/abstracts/${id}`, {
      method: 'DELETE',
    });
  },

  approve: async (id: number, note?: string, points?: number) => {
    if (USE_MOCK_ABSTRACTS) return mockSetStatus(id, 'approved', note, points);
    return apiRequest<Abstract>(`/abstracts/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ note, points }),
    });
  },

  reject: async (id: number, note?: string) => {
    if (USE_MOCK_ABSTRACTS) return mockSetStatus(id, 'rejected', note);
    return apiRequest<Abstract>(`/abstracts/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
  },

  requestMoreInfo: async (id: number, note?: string) => {
    if (USE_MOCK_ABSTRACTS) return mockSetStatus(id, 'more_info_requested', note);
    return apiRequest<Abstract>(`/abstracts/${id}/request-more-info`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
  },

  getHistory: async (id: number) => {
    if (USE_MOCK_ABSTRACTS) return mockOk<AbstractHistory[]>([]);
    return apiRequest<AbstractHistory[]>(`/abstracts/${id}/history`, {
      method: 'GET',
    });
  },

  getChangelog: async (id: number) => {
    if (USE_MOCK_ABSTRACTS) {
      const a = mockAbstracts.find((x) => x.id === id);
      return mockOk<Changelog>({
        currentVersion: (a as Abstract) ?? ({} as Abstract),
        changes: [],
      });
    }
    return apiRequest<Changelog>(`/abstracts/${id}/changelog`, {
      method: 'GET',
    });
  },

  submitReview: async (id: number, data: ScientificReviewPayload) => {
    if (USE_MOCK_ABSTRACTS) {
      const totalScore = Object.values(data).reduce(
        (s, v) => s + (typeof v === 'number' ? v : 0),
        0,
      );
      return mockOk<ScientificReview>({
        id: Date.now(),
        abstractId: id,
        reviewedBy: currentUserEmail(),
        totalScore,
        recommendation: 'accept_poster',
        createdAt: new Date().toISOString(),
        ...data,
      });
    }
    return apiRequest<ScientificReview>(`/abstracts/${id}/reviewer-scores`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getReviews: async (id: number) => {
    if (USE_MOCK_ABSTRACTS) {
      return mockOk<ReviewsSummary>({
        reviews: [],
        averageScientificMerit: 0,
        reviewCount: 0,
        meetsMinimumThreshold: false,
      });
    }
    return apiRequest<ReviewsSummary>(`/abstracts/${id}/reviewer-scores`, {
      method: 'GET',
    });
  },

  submitSCScores: async (id: number, data: SCScorePayload) => {
    if (USE_MOCK_ABSTRACTS) {
      const a = mockAbstracts.find((x) => x.id === id);
      return mockOk<Abstract>((a as Abstract) ?? ({ id } as Abstract));
    }
    return apiRequest<Abstract>(`/abstracts/${id}/sc-scores`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSCScore: async (id: number) => {
    if (USE_MOCK_ABSTRACTS) return mockOk<{ scientificMeritTotal: number }>({ scientificMeritTotal: 0 });
    return apiRequest<{ scientificMeritTotal: number }>(`/abstracts/${id}/sc-scores`, {
      method: 'GET',
    });
  },

  updateBonusPoints: async (id: number, data: BonusPointsPayload) => {
    if (USE_MOCK_ABSTRACTS) {
      const a = mockAbstracts.find((x) => x.id === id);
      if (a) Object.assign(a, data, { updatedAt: new Date().toISOString() });
      return mockOk<Abstract>((a as Abstract) ?? ({ id } as Abstract));
    }
    return apiRequest<Abstract>(`/abstracts/${id}/bonus-points`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  refreshReviewerQueue: async (userId: number) => {
    if (USE_MOCK_ABSTRACTS) {
      return mockOk({ removed: 0, added: 0, displaced: 0, queueSize: 0, capacity: 0 });
    }
    return apiRequest<{
      removed: number;
      added: number;
      displaced: number;
      queueSize: number;
      capacity: number;
    }>(`/abstracts/reviewer-queue/${userId}/refresh`, {
      method: 'POST',
    });
  },

  getReviewerQueueStats: async () => {
    if (USE_MOCK_ABSTRACTS) return mockOk<Record<string, { assigned: number; reviewed: number }>>({});
    return apiRequest<Record<string, { assigned: number; reviewed: number }>>(
      '/abstracts/reviewer-queue/stats',
      { method: 'GET' },
    );
  },

  getStatusCounts: async () => {
    if (USE_MOCK_ABSTRACTS) return mockOk(mockStatusCounts());
    return apiRequest<{
      all: number;
      pending: number;
      under_review: number;
      approved: number;
      rejected: number;
      more_info_requested: number;
    }>('/abstracts/status-counts', { method: 'GET' });
  },

  getReviewerQueueAbstracts: async (userId: number, page = 1, limit = 20) => {
    if (USE_MOCK_ABSTRACTS) {
      return mockOk({ queueSize: 0, capacity: 0, abstracts: [] });
    }
    return apiRequest<{
      queueSize: number;
      capacity: number;
      abstracts: Array<{
        id: number;
        title: string;
        presenterFullName: string;
        subThemeCategory: string;
        status: string;
        reviewed: boolean;
        reviewedAt: string | null;
        totalScore: number | null;
      }>;
    }>(`/abstracts/reviewer-queue/${userId}?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },

  getMySCAssignments: async () => {
    if (USE_MOCK_ABSTRACTS) {
      return mockOk<Array<{
        id: number;
        abstractId: number;
        reviewerEmail: string;
        abstract: Abstract;
      }>>([]);
    }
    return apiRequest<Array<{
      id: number;
      abstractId: number;
      reviewerEmail: string;
      abstract: Abstract;
    }>>('/abstracts/sc-assignments/mine', { method: 'GET' });
  },
};

// Comments API
export const commentsApi = {
  create: async (abstractId: number, comment: string) => {
    return apiRequest<AbstractComment>('/abstract-comments', {
      method: 'POST',
      body: JSON.stringify({ abstractId, comment }),
    });
  },

  getAll: async () => {
    return apiRequest<AbstractComment[]>('/abstract-comments', {
      method: 'GET',
    });
  },

  getById: async (id: number) => {
    return apiRequest<AbstractComment>(`/abstract-comments/${id}`, {
      method: 'GET',
    });
  },

  getByAbstractId: async (abstractId: number) => {
    return apiRequest<AbstractComment[]>(
      `/abstract-comments/abstract/${abstractId}`,
      {
        method: 'GET',
      },
    );
  },

  update: async (id: number, comment: string) => {
    return apiRequest<AbstractComment>(`/abstract-comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ comment }),
    });
  },

  delete: async (id: number) => {
    return apiRequest<void>(`/abstract-comments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Users API (for staff to view participants)
export const usersApi = {
  getAll: async () => {
    return apiRequest<User[]>('/users', {
      method: 'GET',
    });
  },

  getById: async (id: number) => {
    return apiRequest<User>(`/users/${id}`, {
      method: 'GET',
    });
  },
};

// SmartEvent API base URL
const SMARTEVENT_API_URL = '/api/smartevent';

// Helper function for SmartEvent API requests
async function smartEventRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    const response = await fetch(`${SMARTEVENT_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      },
    });

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('SmartEvent API error:', error);
    throw error;
  }
}

// Delegate types
export interface DelegateTableHeader {
  id: number;
  inputcode: string;
  nameEnglish: string;
  inputtype: number;
}

export interface Delegate {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface DelegatesListResponse {
  success: boolean;
  data: Delegate[];
  total?: number;
  message?: string;
}

export interface TableHeadersResponse {
  success: boolean;
  data: DelegateTableHeader[];
  message?: string;
}

// Full delegate detail (from Get_Delegate_Details)
export interface DelegateRecord {
  input_code: string;
  input_name: string;
  input_type: number;
  input_value: string;
}

export interface DelegateDetailResponse {
  message: string;
  data: {
    delegate: Record<string, string | number | null>;
    records: DelegateRecord[];
    profile_picture: string;
    all_category?: unknown;
  };
}

// Delegates API
export const delegatesApi = {
  invite: async (delegateData: {
    email: string;
    firstName: string;
    lastName: string;
  }) => {
    return apiRequest<{ id: number; email: string }>('/delegates/invite', {
      method: 'POST',
      body: JSON.stringify(delegateData),
    });
  },

  // Get table headers/columns for delegates
  getTableHeaders: async (): Promise<TableHeadersResponse> => {
    return smartEventRequest<TableHeadersResponse>(
      '/Get-Table-Headers/Get_Input_Generated/6a251ae181569',
      { method: 'GET' },
    );
  },

  // Get list of delegates
  getAll: async (): Promise<DelegatesListResponse> => {
    return smartEventRequest<DelegatesListResponse>(
      '/Delegates-Data/Get_Delegates_List/6a251ae181569',
      { method: 'POST' },
    );
  },

  // Get full details for a single delegate by badge id
  getDetails: async (badgeId: string): Promise<DelegateDetailResponse> => {
    return smartEventRequest<DelegateDetailResponse>(
      `/Delegates-Data/Get_Delegate_Details/6a251ae181569/${badgeId}`,
      { method: 'GET' },
    );
  },
};

// Co-authors API
export const coauthorsApi = {
  invite: async (abstractId: number, email: string) => {
    return apiRequest<AbstractCoauthor>(`/abstracts/${abstractId}/coauthors`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  getByAbstractId: async (abstractId: number) => {
    return apiRequest<AbstractCoauthor[]>(
      `/abstracts/${abstractId}/coauthors`,
      {
        method: 'GET',
      },
    );
  },

  remove: async (abstractId: number, email: string) => {
    return apiRequest<void>(`/abstracts/${abstractId}/coauthors/${email}`, {
      method: 'DELETE',
    });
  },
};

// Conference Registration Types
export interface RegistrationCategory {
  id: number;
  name_english: string;
  name_french: string;
  fee: string;
  early_payment_date: string;
  end_date: string;
}

export interface FormInputOption {
  id: number;
  contentEnglish: string;
  contentFrench: string;
}

export interface FormInput {
  inputcode: string;
  nameEnglish: string;
  nameFrench: string;
  is_mandatory: 'YES' | 'NO';
  allow_other: 'YES' | 'NO';
  inputtype: {
    id: number;
    name: string;
  };
}

export interface FormInputGroup {
  group: {
    id: number;
    name: string;
    nameFrench: string;
  };
  inputs: Array<{
    input: FormInput;
    options: FormInputOption[];
    value: string;
  }>;
}

export interface RegistrationPageResponse {
  about: {
    english_description: string;
    french_description: string;
    banner: string;
  };
  event_description: {
    event_type: 'HYBRID' | 'PHYSICAL' | 'VIRTUAL';
  };
}

export interface CategoriesResponse {
  data: RegistrationCategory[];
}

export interface CategoryFormResponse {
  data: FormInputGroup[];
  category: {
    form_type: 'SINGLE' | 'MULTI';
    is_free: 'YES' | 'NO';
  };
}

// Registration submission response
export interface RegistrationSubmitResponse {
  message: string | string[];
  data?: {
    delegate_id?: string;
    order_id?: string;
  };
}

// Conference Registration API
export const registrationApi = {
  getRegistrationPage: async (): Promise<RegistrationPageResponse> => {
    return smartEventRequest<RegistrationPageResponse>(
      '/Registration-Page-Api',
      {
        method: 'GET',
      },
    );
  },

  getCategories: async (
    attendanceType: 'PHYSICAL' | 'VIRTUAL',
  ): Promise<CategoriesResponse> => {
    return smartEventRequest<CategoriesResponse>(
      '/Display-Registration-Categories',
      {
        method: 'POST',
        body: JSON.stringify({
          attendence: attendanceType,
          operation: 'get-categories',
        }),
      },
    );
  },

  getCategoryForm: async (
    categoryId: number,
    attendanceType: 'PHYSICAL' | 'VIRTUAL',
  ): Promise<CategoryFormResponse> => {
    return smartEventRequest<CategoryFormResponse>(
      '/Display-Categories-Form-Inputs',
      {
        method: 'POST',
        body: JSON.stringify({
          category: categoryId,
          attendence: attendanceType,
          operation: 'get-form-inputs',
        }),
      },
    );
  },

  submitRegistration: async (
    data:
      | FormData
      | {
          delegate_data: string;
          ticket_id: number;
          attendence_type: string;
          user_language: string;
          accompanied: string;
          registration_email?: string;
          first_name?: string;
          last_name?: string;
          order_id?: string;
          payment_token?: string;
          payment_session?: string;
        },
  ): Promise<{
    success: boolean;
    message: string | string[];
    data?: Record<string, unknown>;
  }> => {
    let body: BodyInit;
    let headers: Record<string, string> = {};

    if (data instanceof FormData) {
      // Send FormData as-is - browser will handle Content-Type with boundary
      body = data;
    } else {
      // For object data, JSON stringify
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    const response = await fetch(`${SMARTEVENT_API_URL}/Register-Delegate`, {
      method: 'POST',
      headers,
      body,
    });
    const result = await response.json();
    return {
      success: response.ok,
      message: result.message,
      data: result.data,
    };
  },

  inviteBulkDelegates: async (data: FormData): Promise<{
    success: boolean;
    message: string | string[];
    data?: Record<string, unknown>;
  }> => {
    const response = await fetch(`${SMARTEVENT_API_URL}/Invite-Bulk-Delegates`, {
      method: 'POST',
      body: data,
    });
    const result = await response.json();
    return {
      success: response.ok,
      message: result.message,
      data: result.data,
    };
  },
};
