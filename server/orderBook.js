const fs = require('fs');
const path = require('path');
const { OrderBook } = require('nodejs-order-book');
const db = process.env.DATABASE_URL ? require('./db') : null;

const DATA_DIR = path.join(__dirname, 'data');
if (!process.env.DATABASE_URL) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MARKET = 'BTCUSDT'; // for now we only handle one market

function snapshotPath() {
  return path.join(DATA_DIR, `${MARKET}-snapshot.json`);
}

function journalPath() {
  return path.join(DATA_DIR, `${MARKET}-journal.json`);
}

async function loadJsonSafely(filePath) {
  try {
    if (process.env.DATABASE_URL) {
      // we won't use filePath
      const snap = await db.loadSnapshot(MARKET);
      return snap;
    } else {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err);
  }
  return null;
}

async function persistJson(filePath, obj) {
  try {
    if (process.env.DATABASE_URL) {
      await db.saveSnapshot(MARKET, obj);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(obj));
    }
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err);
  }
}

// Load previous state (async) but OrderBook needs it sync; so we load sync for non-db; if db, we will await before export
let lastSnapshot = null;
let lastJournal = [];

async function initState() {
  if (process.env.DATABASE_URL) {
    await db.init();
    lastSnapshot = await db.loadSnapshot(MARKET);
    lastJournal = await db.loadJournal(MARKET);
  } else {
    lastSnapshot = await loadJsonSafely(snapshotPath());
    lastJournal = (await loadJsonSafely(journalPath())) || [];
  }
}

// We'll export a promise that resolves when ready
const ready = (async () => {
  await initState();
})();

// Create OrderBook
const ob = new OrderBook({
  snapshot: lastSnapshot || undefined,
  journal: lastJournal,
  enableJournaling: true,
});

// Hook to persist log after each operation
async function persistLog(log) {
  if (!log) return;
  if (process.env.DATABASE_URL) {
    await db.appendLog(MARKET, log);
  } else {
    const current = loadJsonSafely(journalPath()) || [];
    current.push(log);
    persistJson(journalPath(), current);
  }
}

// Helper to decide when to snapshot (every 100 ops)
let opCounter = 0;
async function maybeSnapshot() {
  opCounter += 1;
  if (opCounter % 100 === 0) {
    console.log(`[OrderBook] Taking snapshot after ${opCounter} ops`);
    await persistJson(snapshotPath(), ob.snapshot());
    // you may also truncate journal here for real production usage
  }
}

// Public API
module.exports = {
  MARKET,
  ob,
  ready,
  async placeOrder(params) {
    const { type = 'limit' } = params;
    let result;
    try {
      if (type === 'market') {
        result = ob.market(params);
      } else if (type === 'limit') {
        result = ob.limit(params);
      } else {
        throw new Error(`Unsupported order type ${type}`);
      }
      await persistLog(result.log);
      await maybeSnapshot();
      return result;
    } catch (err) {
      console.error('[OrderBook] placeOrder error', err);
      throw err;
    }
  },
  async cancelOrder(id) {
    const removed = ob.cancel(id);
    if (removed && removed.log) {
      await persistLog(removed.log);
      await maybeSnapshot();
    }
    return removed;
  },
  depth(level = 10) {
    const snap = ob.snapshot();
    const asks = snap.asks
      .map((lvl) => [lvl.price, lvl.orders.reduce((acc, o) => acc + o.size, 0)])
      .sort((a, b) => a[0] - b[0])
      .slice(0, level);
    const bids = snap.bids
      .map((lvl) => [lvl.price, lvl.orders.reduce((acc, o) => acc + o.size, 0)])
      .sort((a, b) => b[0] - a[0])
      .slice(0, level);
    return { asks, bids };
  },
}; 