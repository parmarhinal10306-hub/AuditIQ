const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
require('dotenv').config();

const healthRouter = require('./routes/health');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Global middleware ── */
app.use(helmet());

// Robust CORS handling supporting single or comma-separated origins, trailing slash normalization, and Vercel subdomains
const configuredFrontends = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultDevFrontends = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];
const allowedOrigins = Array.from(new Set([...configuredFrontends, ...defaultDevFrontends]));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, server-to-server, curl, Render health checks)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');
    const isAllowed = allowedOrigins.includes(normalizedOrigin) ||
      /^https:\/\/audit-iq-[a-z0-9-]+.*\.vercel\.app$/.test(normalizedOrigin) ||
      /^https:\/\/audit-iq.*\.vercel\.app$/.test(normalizedOrigin);

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`[cors] Rejected origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Rate limiting ── */
// Apply the general limiter to all /api/* routes
app.use('/api', generalLimiter);

/* ── Routes ── */
const authRouter      = require('./routes/auth');
const auditRouter     = require('./routes/audits');
const dashboardRouter = require('./routes/dashboard');

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/audits', auditRouter);
app.use('/api/dashboard', dashboardRouter);

/* ── 404 handler ── */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

/* ── Global error handler ── */
app.use(errorHandler);

/* ── Start ── */
const { connectDB } = require('./config/db');

connectDB().then(() => {
  app.listen(PORT, () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[server] SEO/AEO/GEO Audit API running on port ${PORT}`);
    }
  });
});
