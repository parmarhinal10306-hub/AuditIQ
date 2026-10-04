export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://auditiq-wtan.onrender.com/api').replace(/\/+$/, '');

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  console.warn('⚠️ [AuditIQ] VITE_API_BASE_URL is not set in environment variables. Defaulting to https://auditiq-wtan.onrender.com/api');
}
