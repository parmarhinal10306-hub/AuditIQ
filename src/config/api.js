const isProd = import.meta.env.PROD;

export const API_BASE_URL = isProd
  ? 'https://auditiq-wtan.onrender.com/api'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

if (isProd) {
  console.log('⚠️ [AuditIQ] Production API connecting to Render:', API_BASE_URL);
}
