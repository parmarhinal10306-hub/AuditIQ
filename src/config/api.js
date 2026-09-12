export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  console.error('⚠️ [AuditIQ] CRITICAL: VITE_API_BASE_URL is not defined in your Vercel Environment Variables.');
  console.error('⚠️ [AuditIQ] API requests will fail. Please add VITE_API_BASE_URL and REDEPLOY the application.');
}
