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

const allowList = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests, or same-origin)
    // Actually, to be strictly secure and "Allow requests only from the configured frontend URL":
    if (!origin) return callback(null, true);
    if (allowList.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
