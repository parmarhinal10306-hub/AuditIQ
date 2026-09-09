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

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
  credentials: true
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
