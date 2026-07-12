const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');

const start = async () => {
  try {
    // Verify DB connection
    await pool.query('SELECT 1');
    console.log('✓ Database connected');

    app.listen(env.PORT, () => {
      console.log(`✓ AssetFlow API running on http://localhost:${env.PORT}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
