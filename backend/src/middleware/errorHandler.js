const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    return res.status(409).json({ error: 'Duplicate entry', detail: err.detail });
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    return res.status(400).json({ error: 'Referenced record not found', detail: err.detail });
  }

  if (err.code === '23514') {
    // PostgreSQL check constraint violation
    return res.status(400).json({ error: 'Constraint violation', detail: err.detail });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ error: message });
};

const notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
};

module.exports = { errorHandler, notFound };
