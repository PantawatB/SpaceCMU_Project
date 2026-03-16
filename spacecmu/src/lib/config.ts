// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  TIMEOUT: 30000,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/cmu/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/users/me',
    SWITCH_MODE: '/api/auth/switch-mode',
    SWITCH_TO_OFFICIAL: '/api/auth/switch-to-official',
    EXIT_OFFICIAL: '/api/auth/exit-official',
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
    BY_DATE: (date: string) => `/api/calendar/date?date=${date}`,
    TODAY: '/api/calendar/today',
    TOGGLE: (eventId: string) => `/api/calendar/${eventId}/toggle`,
    DELETE: (eventId: string) => `/api/calendar/${eventId}`,
  },
  MESSAGES: {
    LIST: '/api/messages',
    SEND: '/api/messages',
  },
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (notificationId: string) => `/api/notifications/${notificationId}/read`,
  },
  SETTINGS: {
    AVATAR: '/api/users/profile/avatar',
    BANNER: '/api/settings/banner',
    PROFILE: '/api/users/profile',
  },
} as const;
