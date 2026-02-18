import { API_CONFIG, API_ENDPOINTS } from './config';
import { UserMeResponse } from '@/types/user';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  /**
   * Get full URL for uploaded images
   * Converts relative paths like "/uploads/image.jpg" to "http://localhost:3001/uploads/image.jpg"
   */
  getImageUrl(relativePath: string | null | undefined): string | null {
    if (!relativePath) return null;
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    return `${this.baseURL}${relativePath}`;
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

  // Add more API methods as needed
}

// Export singleton instance
export const apiService = new ApiService();
