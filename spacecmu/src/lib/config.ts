// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001', // เปลี่ยนที่นี่ถ้าต้องการใช้ API URL อื่น
  TIMEOUT: 30000,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/cmu/login',
    LOGOUT: '/api/signOut',
    ME: '/api/users/me',
  },
  USERS: {
    PROFILE: (userId: string) => `/api/users/${userId}`,
    UPDATE_PROFILE: (userId: string) => `/api/users/${userId}`,
  },
  POSTS: {
    LIST: '/api/posts',
    CREATE: '/api/posts',
    DETAIL: (postId: string) => `/api/posts/${postId}`,
  },
  FRIENDS: {
    LIST: '/api/friends',
    REQUESTS: '/api/friends/requests',
  },
  MARKET: {
    LIST: '/api/market',
    CREATE: '/api/market',
    DETAIL: (itemId: string) => `/api/market/${itemId}`,
  },
  CALENDAR: {
    EVENTS: '/api/calendar',
    CREATE: '/api/calendar',
  },
  MESSAGES: {
    LIST: '/api/messages',
    SEND: '/api/messages',
  },
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (notificationId: string) => `/api/notifications/${notificationId}/read`,
  },
} as const;
