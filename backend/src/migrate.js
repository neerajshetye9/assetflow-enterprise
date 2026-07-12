/**
 * Migration runner — reads SQL files in order and runs them against the DB.
 * Tracks completed migrations in migration_runs to make it idempotent.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'assetflow',
  password: process.env.DB_PASSWORD || 'assetflow_secret',
  database: process.env.DB_NAME || 'assetflow_enterprise',
});

const migrationsDir = path.join(__dirname, '..', 'migrations');
const seedsDir = path.join(__dirname, '..', 'seeds');

const runSqlFile = async (client, filePath, filename) => {
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      `INSERT INTO migration_runs (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
      [filename]
    );
    await client.query('COMMIT');
    console.log(`  ✓ ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`Migration failed [${filename}]: ${err.message}`);
  }
};

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('=== RUNNING MIGRATIONS ===');

    // Always run the tracker table first (no tracking of itself)
    const trackerSql = fs.readFileSync(path.join(migrationsDir, '000_migration_runs.sql'), 'utf8');
    await client.query(trackerSql);

    const { rows: ran } = await client.query('SELECT filename FROM migration_runs');
    const ranSet = new Set(ran.map((r) => r.filename));

    const files = fs.readdirSync(migrationsDir).sort().filter((f) => f.endsWith('.sql') && f !== '000_migration_runs.sql');

    for (const file of files) {
      if (ranSet.has(file)) {
        console.log(`  - ${file} (already ran)`);
        continue;
      }
      await runSqlFile(client, path.join(migrationsDir, file), file);
    }

    console.log('\n=== RUNNING SEEDS ===');
    const seedFiles = fs.readdirSync(seedsDir).sort().filter((f) => f.endsWith('.sql'));
    for (const file of seedFiles) {
      if (ranSet.has(`seed_${file}`)) {
        console.log(`  - seed_${file} (already ran)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO migration_runs (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
        [`seed_${file}`]
      );
      await client.query('COMMIT');
      console.log(`  ✓ seed_${file}`);
    }

    console.log('\n✓ All migrations and seeds complete.');
  } catch (err) {
    console.error('\n✗ Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
