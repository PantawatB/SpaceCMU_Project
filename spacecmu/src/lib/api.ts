import { API_CONFIG, API_ENDPOINTS } from './config';
import { UserMeResponse } from '@/types/user';

/**
 * Read the JWT token from cookie (works because cookie is not httpOnly)
 */
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Drop-in replacement for fetch() that automatically attaches the
 * Authorization: Bearer <token> header so requests work cross-domain.
 * Use this everywhere instead of raw fetch() for backend API calls.
 */
export function fetchWithToken(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getTokenFromCookie();
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { credentials: 'include', ...options, headers });
}

export interface GodStats {
  totalUsers: number;
  totalAdmins: number;
  totalRoleUsers: number;
  totalOfficialAccounts: number;
  totalBanned: number;
  totalPosts: number;
  activeSessions: number;
  totalReports: number;
}

export interface GodUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  email: string;
  role: 'user' | 'admin' | 'god' | 'official_account';
  status: 'active' | 'banned';
  isAnonymous: boolean;
  parentUserId: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  avatarUrl?: string | null;
  faculty?: string | null;
}

export interface OfficialAccountAdmin {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  email: string;
  role: string;
  grantedAt: string;
}

export interface OfficialAccount {
  id: string;
  userId: string;
  name: string;
  username: string;
  faculty: string;
  createdAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    username: string | null;
    email: string;
  } | null;
  admins: OfficialAccountAdmin[];
}

export interface MyOfficialAccount extends OfficialAccount {
  isOwner: boolean;
  ownerId: string;
  status?: 'active' | 'banned' | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  admins: (OfficialAccountAdmin & { avatarUrl?: string | null })[];
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    username: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface GodActivity {
  id: string;
  action: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

export interface UserSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  studentId: string | null;
  avatarUrl: string | null;
  bio: string | null;
  faculty: string | null;
  major: string | null;
  year: string | null;
  friendsCount: number | null;
}

export interface AccountNotification {
  id: string;
  recipientId: string;
  senderId: string | null;
  type: 'like' | 'comment' | 'friend_request' | 'other' | 'repost' | 'reply' | 'comment_like' | 'friend_accept';
  referenceId: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  } | null;
}

export interface SentNotification {
  message: string | null;
  sentAt: string;
  recipientCount: number;
  recipientPreview: string | null;
  isGlobal: boolean;
}

export interface SentNotificationPage {
  data: SentNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface NotificationPage {
  data: AccountNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ActivityPage {
  data: GodActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface Report {
  id: string;
  name: string | null;
  issue: string;
  mediaUrls: string[];
  postId: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  submitter: {
    id: string;
    firstName: string;
    lastName: string;
    username: string | null;
    email: string;
    avatarUrl: string | null;
    role: string;
  } | null;
}

export interface ReportPage {
  data: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  /**
   * Get full URL for uploaded images
   * Converts relative paths like "/uploads/image.jpg" to "http://localhost:3001/uploads/image.jpg"
   * Paths that don't start with "/uploads/" are treated as Next.js public files (served as-is).
   */
  getImageUrl(relativePath: string | null | undefined): string | null {
    if (!relativePath) return null;
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    // Only prepend backend base URL for actual uploaded files
    if (relativePath.startsWith('/uploads/')) {
      return `${this.baseURL}${relativePath}`;
    }
    // Anything else (e.g. "/default-avatar.svg") is a Next.js public asset — return as-is
    return relativePath;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private getTokenFromCookie(): string | null {
    return getTokenFromCookie();
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {},
    suppressTokenError: boolean = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const token = this.getTokenFromCookie();
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include', // Important for cookies
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle token errors — only dispatch event when NOT suppressed
        if (response.status === 401 && !suppressTokenError) {
          if (errorData.message === "No token provided" || 
              errorData.message?.toLowerCase().includes("token") ||
              errorData.message?.toLowerCase().includes("unauthorized")) {
            // Emit custom event for token error
            window.dispatchEvent(new CustomEvent('tokenError', { 
              detail: { message: errorData.message } 
            }));
          }
        }
        
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      if (!suppressTokenError) console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * Silent version of fetchWithAuth — does NOT log to console.
   * Use for expected errors (e.g. ACCOUNT_BANNED on switch-mode).
   */
  private async fetchWithAuthSilent<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getTokenFromCookie();
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
    };
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * GET request — silent version: returns null on 404, does NOT log to console.
   * Use this when "not found" is an expected/normal outcome (e.g. checking if a resource still exists).
   */
  async getOptional<T>(endpoint: string): Promise<T | null> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getTokenFromCookie();
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      if (response.status === 404) return null;
      if (!response.ok) {
        // For non-404 errors, still throw so callers can handle them
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json() as T;
    } catch (error) {
      // Only re-throw non-404 errors; 404 is already handled above
      throw error;
    }
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<T> {
    return this.fetchFormData<T>(endpoint, formData, 'POST', options);
  }

  /**
   * PATCH request with FormData (for file uploads)
   */
  async patchFormData<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<T> {
    return this.fetchFormData<T>(endpoint, formData, 'PATCH', options);
  }

  /**
   * Internal helper for FormData requests
   */
  private async fetchFormData<T>(
    endpoint: string,
    formData: FormData,
    method: 'POST' | 'PATCH',
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getTokenFromCookie();
    
    const config: RequestInit = {
      ...options,
      method,
      body: formData,
      credentials: 'include',
      headers: {
        // Don't set Content-Type for FormData, browser will set it automatically with boundary
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle token errors
        if (response.status === 401) {
          if (errorData.message === "No token provided" || 
              errorData.message?.toLowerCase().includes("token") ||
              errorData.message?.toLowerCase().includes("unauthorized")) {
            window.dispatchEvent(new CustomEvent('tokenError', { 
              detail: { message: errorData.message } 
            }));
          }
        }
        
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // User API methods
  async getCurrentUser(): Promise<UserMeResponse> {
    return this.get<UserMeResponse>(API_ENDPOINTS.AUTH.ME);
  }

  /**
   * Silent version of getCurrentUser — suppresses tokenError events and console logs.
   * Use this for background polling so a post-ban 401 doesn't trigger the
   * "Token expired" popup or console noise.
   */
  async getCurrentUserSilent(): Promise<UserMeResponse> {
    return this.fetchWithAuth<UserMeResponse>(API_ENDPOINTS.AUTH.ME, { method: 'GET' }, true);
  }

  async logout(): Promise<void> {
    return this.post<void>(API_ENDPOINTS.AUTH.LOGOUT);
  }

  async switchMode(mode: 'PUBLIC' | 'ANONYMOUS'): Promise<void> {
    // Use silent fetch — ACCOUNT_BANNED (403) is an expected/handled error,
    // not a bug, so we don't want it polluting the console.
    return this.fetchWithAuthSilent<void>(API_ENDPOINTS.AUTH.SWITCH_MODE, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  async switchToOfficialAccount(officialAccountId: string): Promise<{
    success: boolean;
    activeUser: import('@/types/user').User;
    officialAccount: { id: string; name: string; username: string; faculty: string; userId: string; avatarUrl: string | null };
  }> {
    return this.post(API_ENDPOINTS.AUTH.SWITCH_TO_OFFICIAL, { officialAccountId });
  }

  async exitOfficialAccount(): Promise<{
    success: boolean;
    activeUser: import('@/types/user').User;
    officialAccount: null;
  }> {
    return this.post(API_ENDPOINTS.AUTH.EXIT_OFFICIAL);
  }

  // God API methods
  async getGodStats(): Promise<GodStats> {
    return this.get<GodStats>('/api/god/stats');
  }

  async getGodUsers(): Promise<GodUser[]> {
    return this.get<GodUser[]>('/api/god/users');
  }

  async setGodUserRole(userId: string, role: 'user' | 'admin'): Promise<{ message: string; user: { id: string; role: string } }> {
    return this.patch<{ message: string; user: { id: string; role: string } }>(`/api/god/users/${userId}/role`, { role });
  }

  async setGodUserStatus(userId: string, status: 'active' | 'banned'): Promise<{ message: string; user: { id: string; status: string } }> {
    return this.patch<{ message: string; user: { id: string; status: string } }>(`/api/god/users/${userId}/status`, { status });
  }

  async getGodActivities(page = 1, limit = 20): Promise<ActivityPage> {
    return this.get<ActivityPage>(`/api/god/activities?page=${page}&limit=${limit}`);
  }

  async searchUsers(query: string): Promise<GodUser[]> {
    return this.get<GodUser[]>(`/api/users/search?query=${encodeURIComponent(query)}`);
  }

  /** Search users — excludes official_account role, used for adding admins (session-auth only) */
  async searchUsersForOfficialAccount(query: string): Promise<GodUser[]> {
    return this.get<GodUser[]>(`/api/god/users/search?query=${encodeURIComponent(query)}`);
  }

  // Admin — official accounts ที่ตัวเองบริหาร
  async getMyOfficialAccounts(): Promise<MyOfficialAccount[]> {
    return this.get<MyOfficialAccount[]>('/api/admin/my-official-accounts');
  }

  async addAdminToMyAccount(officialAccountId: string, adminUserId: string): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/api/admin/my-official-accounts/${officialAccountId}/admins`, { adminUserId });
  }

  async removeAdminFromMyAccount(officialAccountId: string, adminUserId: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/api/admin/my-official-accounts/${officialAccountId}/admins/${adminUserId}`);
  }

  async leaveOfficialAccount(officialAccountId: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/api/admin/my-official-accounts/${officialAccountId}/leave`);
  }

  async transferOwnership(officialAccountId: string, newOwnerId: string): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/api/admin/my-official-accounts/${officialAccountId}/transfer-owner`, { newOwnerId });
  }

  // Official Accounts API methods
  async getOfficialAccounts(): Promise<OfficialAccount[]> {
    return this.get<OfficialAccount[]>('/api/god/official-accounts');
  }

  async createOfficialAccount(data: {
    name: string;
    username: string;
    faculty: string;
    ownerUserId: string;
  }): Promise<{ message: string; officialAccount: OfficialAccount }> {
    return this.post<{ message: string; officialAccount: OfficialAccount }>(
      '/api/god/official-accounts',
      data
    );
  }

  async addOfficialAccountAdmin(
    officialAccountId: string,
    adminUserId: string
  ): Promise<{ message: string }> {
    return this.post<{ message: string }>(
      `/api/god/official-accounts/${officialAccountId}/admins`,
      { adminUserId }
    );
  }

  async removeOfficialAccountAdmin(
    officialAccountId: string,
    adminUserId: string
  ): Promise<{ message: string }> {
    return this.delete<{ message: string }>(
      `/api/god/official-accounts/${officialAccountId}/admins/${adminUserId}`
    );
  }

  /** Send global notification to all users (god only) */
  async sendGlobalNotification(message: string): Promise<{ message: string; count: number }> {
    return this.post<{ message: string; count: number }>(
      '/api/god/notifications/global',
      { message }
    );
  }

  /** Send private notification to selected users (god only) */
  async sendPrivateNotifications(recipientIds: string[], message: string): Promise<{ message: string; count: number }> {
    return this.post<{ message: string; count: number }>(
      '/api/god/notifications/private',
      { recipientIds, message }
    );
  }

  /** Get notifications for a specific user (by userId), paginated */
  async getNotificationsForUser(userId: string, page = 1, limit = 10): Promise<NotificationPage> {
    return this.get<NotificationPage>(`/api/notifications/${userId}?page=${page}&limit=${limit}`);
  }

  /** Mark all notifications as read for a specific user (admin panel use) */
  async markAllNotificationsReadForUser(userId: string): Promise<{ message: string }> {
    return this.patch<{ message: string }>(`/api/notifications/${userId}/read-all`, {});
  }

  /** Get sent notifications history (god only), paginated */
  async getSentNotifications(page = 1, limit = 10): Promise<SentNotificationPage> {
    return this.get<SentNotificationPage>(`/api/god/notifications/sent?page=${page}&limit=${limit}`);
  }

  /** Search ALL users including official_account role (for private message) */
  async searchAllUsersForMessage(query: string): Promise<GodUser[]> {
    return this.get<GodUser[]>(`/api/god/users/search-all?query=${encodeURIComponent(query)}`);
  }

  /** Submit a user report with optional media files */
  async submitReport(formData: FormData): Promise<{ message: string }> {
    return this.postFormData<{ message: string }>('/api/reports', formData);
  }

  /** Get all reports (god only), paginated */
  async getReports(page = 1, limit = 20, status = 'all'): Promise<ReportPage> {
    return this.get<ReportPage>(`/api/god/reports?page=${page}&limit=${limit}&status=${status}`);
  }

  /** Update a report's status (god only) */
  async updateReportStatus(reportId: string, status: 'open' | 'resolved' | 'dismissed'): Promise<{ message: string }> {
    return this.patch<{ message: string }>(`/api/god/reports/${reportId}/status`, { status });
  }

  /** Search posts by content query — respects Friends-only visibility */
  async searchPosts(query: string, limit = 20, cursor?: string): Promise<{
    posts: unknown[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return this.get(`/api/posts/search?${params.toString()}`);
  }

}

// Export singleton instance //
export const apiService = new ApiService();
