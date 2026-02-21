import { API_CONFIG, API_ENDPOINTS } from './config';
import { UserMeResponse } from '@/types/user';

export interface GodStats {
  totalUsers: number;
  totalAdmins: number;
  totalBanned: number;
  totalPosts: number;
  activeSessions: number;
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
  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Important for cookies
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
      console.error('API Error:', error);
      throw error;
    }
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
    
    const config: RequestInit = {
      ...options,
      method,
      body: formData,
      credentials: 'include',
      headers: {
        // Don't set Content-Type for FormData, browser will set it automatically with boundary
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

  async logout(): Promise<void> {
    return this.post<void>(API_ENDPOINTS.AUTH.LOGOUT);
  }

  async switchMode(mode: 'PUBLIC' | 'ANONYMOUS'): Promise<void> {
    return this.post<void>(API_ENDPOINTS.AUTH.SWITCH_MODE, { mode });
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

  async getGodActivities(): Promise<GodActivity[]> {
    return this.get<GodActivity[]>('/api/god/activities');
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

}

// Export singleton instance
export const apiService = new ApiService();
