const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ─── Security ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// ─── Rate Limiting ───────────────────────────────────────────
app.use(
  '/api/auth',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests' } })
);

// ─── Body Parsing ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', env: env.NODE_ENV }));

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/org', require('./modules/organization/organization.routes'));
app.use('/api/audit', require('./modules/audit/audit.routes'));
app.use('/api/assets', require('./modules/assets/assets.routes'));
app.use('/api/allocations', require('./modules/allocations/allocations.routes'));
app.use('/api/transfers', require('./modules/transfers/transfers.routes'));
app.use('/api/returns', require('./modules/returns/returns.routes'));
app.use('/api/maintenance', require('./modules/maintenance/maintenance.routes'));
app.use('/api/resources', require('./modules/resources/resources.routes'));
app.use('/api/bookings', require('./modules/bookings/bookings.routes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/notifications', require('./modules/notifications/notifications.routes'));
app.use('/api/activity-logs', require('./modules/activity-logs/activityLogs.routes'));
app.use('/api/reports', require('./modules/reports/reports.routes'));

// ─── Error Handling ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
