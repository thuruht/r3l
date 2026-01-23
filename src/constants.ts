// src/constants.ts

export const FILE_EXPIRATION_HOURS = 168; // 7 days
export const VITALITY_ARCHIVE_THRESHOLD = 10;
export const MESSAGE_PURGE_DAYS = 30;
export const RATE_LIMITS = {
  register: { limit: 5, window: 3600 },
  login: { limit: 10, window: 600 },
  forgot: { limit: 3, window: 3600 },
  reset: { limit: 3, window: 3600 },
  drift: { limit: 20, window: 600 },
  feedback: { limit: 3, window: 3600 },
  vitality: { limit: 10, window: 60 }
};
export const ADMIN_USER_ID = parseInt(typeof process !== 'undefined' ? process.env?.ADMIN_USER_ID || '1' : '1');
