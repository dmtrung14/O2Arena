const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  max: 5,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snapshots (
      market TEXT PRIMARY KEY,
      data   JSONB NOT NULL,
      ts     TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS journals (
      id      BIGSERIAL PRIMARY KEY,
      market  TEXT NOT NULL,
      log     JSONB NOT NULL,
      ts      TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS journals_market_id_idx ON journals(market, id);
  `);
}

async function loadSnapshot(market) {
  const { rows } = await pool.query('SELECT data FROM snapshots WHERE market=$1', [market]);
  return rows[0]?.data || null;
}

async function saveSnapshot(market, data) {
  await pool.query(
    `INSERT INTO snapshots(market, data) VALUES ($1, $2)
     ON CONFLICT (market) DO UPDATE SET data=EXCLUDED.data, ts=now()`,
    [market, data]
  );
}

async function loadJournal(market, afterId = 0) {
  const { rows } = await pool.query('SELECT id, log FROM journals WHERE market=$1 AND id>$2 ORDER BY id ASC', [market, afterId]);
  return rows.map((r) => r.log);
}

async function appendLog(market, log) {
  await pool.query('INSERT INTO journals(market, log) VALUES ($1, $2)', [market, log]);
}

module.exports = { init, loadSnapshot, saveSnapshot, loadJournal, appendLog }; 