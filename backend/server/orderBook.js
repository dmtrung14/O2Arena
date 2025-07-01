const fs = require('fs');
const path = require('path');
const { OrderBook } = require('nodejs-order-book');
const db = process.env.DATABASE_URL ? require('./db') : null;
const fetch = require('node-fetch');

const DATA_DIR = path.join(__dirname, 'data');
if (!process.env.DATABASE_URL) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Support multiple markets
const SUPPORTED_MARKETS = {
  // Crypto markets
  'BTC-USDC': 'BTCUSDT',
  'ETH-USDC': 'ETHUSDT', 
  'SOL-USDC': 'SOLUSDT',
  'DOGE-USDC': 'DOGEUSDT',
  'ADA-USDC': 'ADAUSDT',
  // Stock markets
  'TSLA': 'TSLA',
  'NVDA': 'NVDA',
  'META': 'META',
  'PLTR': 'PLTR',
  'SNOW': 'SNOW',
  'UBER': 'UBER',
  'HOOD': 'HOOD',
  'ABNB': 'ABNB'
};

// Market ID to symbol mapping (from your frontend)
const MARKET_ID_MAP = {
  // Crypto markets
  4: 'BTC-USDC',
  3: 'ETH-USDC', 
  5: 'SOL-USDC',
  6: 'DOGE-USDC',
  7: 'ADA-USDC',
  // Stock markets
  8: 'TSLA',
  9: 'NVDA',
  10: 'META',
  11: 'PLTR',
  12: 'SNOW',
  13: 'UBER',
  14: 'HOOD',
  15: 'ABNB'
};

// Store order books for each market
const orderBooks = new Map();
const marketReady = new Map();

function snapshotPath(market) {
  return path.join(DATA_DIR, `${market}-snapshot.json`);
}

function journalPath(market) {
  return path.join(DATA_DIR, `${market}-journal.json`);
}

async function loadJsonSafely(filePath, market) {
  try {
    if (process.env.DATABASE_URL) {
      const snap = await db.loadSnapshot(market);
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

async function persistJson(filePath, obj, market) {
  try {
    if (process.env.DATABASE_URL) {
      await db.saveSnapshot(market, obj);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(obj));
    }
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err);
  }
}

async function initMarket(market) {
  let lastSnapshot = null;
  let lastJournal = [];

  if (process.env.DATABASE_URL) {
    await db.init();
    lastSnapshot = await db.loadSnapshot(market);
    lastJournal = await db.loadJournal(market);
  } else {
    lastSnapshot = await loadJsonSafely(snapshotPath(market), market);
    lastJournal = (await loadJsonSafely(journalPath(market), market)) || [];
  }

  // Create OrderBook for this market
  const ob = new OrderBook({
    snapshot: lastSnapshot || undefined,
    journal: lastJournal,
    enableJournaling: true,
  });

  orderBooks.set(market, ob);
  marketReady.set(market, true);
  
  console.log(`[OrderBook] Initialized market: ${market}`);
  
  // Add some initial mock liquidity for demonstration
  await addMockLiquidity(market);
  
  return ob;
}

async function addMockLiquidity(market) {
  const ob = orderBooks.get(market);
  if (!ob) return;
  
  // Get approximate price for each market
  const basePrices = {
    // Crypto markets
    'BTC-USDC': 100000,
    'ETH-USDC': 3500,
    'SOL-USDC': 200,
    'DOGE-USDC': 0.35,
    'ADA-USDC': 1.2,
    // Stock markets
    'TSLA': 350,
    'NVDA': 140,
    'META': 580,
    'PLTR': 45,
    'SNOW': 120,
    'UBER': 85,
    'HOOD': 25,
    'ABNB': 160
  };
  
  const basePrice = basePrices[market] || 100;
  const spread = basePrice * 0.001; // 0.1% spread
  
  console.log(`[OrderBook] Adding mock liquidity for ${market} around $${basePrice}`);
  
  // Add bid levels (buy orders)
  for (let i = 1; i <= 10; i++) {
    const price = basePrice - (spread * i);
    const size = Math.random() * 5 + 0.1;
    
    try {
      await placeOrder(market, {
        id: `MOCK-BID-${market}-${i}-${Date.now()}`,
        side: 'buy',
        price: price,
        size: size,
        type: 'limit'
      });
    } catch (err) {
      console.error(`Error adding mock bid for ${market}:`, err);
    }
  }
  
  // Add ask levels (sell orders)
  for (let i = 1; i <= 10; i++) {
    const price = basePrice + (spread * i);
    const size = Math.random() * 5 + 0.1;
    
    try {
      await placeOrder(market, {
        id: `MOCK-ASK-${market}-${i}-${Date.now()}`,
        side: 'sell',
        price: price,
        size: size,
        type: 'limit'
      });
    } catch (err) {
      console.error(`Error adding mock ask for ${market}:`, err);
    }
  }
}

// Initialize all supported markets
const ready = (async () => {
  console.log('[OrderBook] Initializing all markets...');
  for (const market of Object.keys(SUPPORTED_MARKETS)) {
    await initMarket(market);
  }
  console.log('[OrderBook] All markets initialized');
})();

// Helper to persist log after each operation
async function persistLog(market, log) {
  if (!log) return;
  if (process.env.DATABASE_URL) {
    await db.appendLog(market, log);
  } else {
    const current = (await loadJsonSafely(journalPath(market), market)) || [];
    if (!Array.isArray(current)) {
      console.warn(`[OrderBook] journal file corrupted for ${market}, resetting`);
      await persistJson(journalPath(market), [], market);
      current.length = 0;
    }
    current.push(log);
    await persistJson(journalPath(market), current, market);
  }
}

// Helper to decide when to snapshot (every 100 ops per market)
const opCounters = new Map();

async function maybeSnapshot(market) {
  const count = (opCounters.get(market) || 0) + 1;
  opCounters.set(market, count);
  
  if (count % 100 === 0) {
    console.log(`[OrderBook] Taking snapshot for ${market} after ${count} ops`);
    const ob = orderBooks.get(market);
    if (ob) {
      await persistJson(snapshotPath(market), ob.snapshot(), market);
    }
  }
}

// Define placeOrder as a local function so it can be used internally
async function placeOrder(market, params) {
  const ob = orderBooks.get(market);
  if (!ob) {
    throw new Error(`Market ${market} not supported`);
  }
  
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
    
    await persistLog(market, result.log);
    await maybeSnapshot(market);
    return result;
  } catch (err) {
    console.error(`[OrderBook] placeOrder error for ${market}`, err);
    throw err;
  }
}

// Helper to map our market symbol to Yahoo Finance symbol
function getYahooSymbol(market) {
  const map = {
    'BTC-USDC': 'BTC-USD',
    'ETH-USDC': 'ETH-USD',
    'SOL-USDC': 'SOL-USD',
    'DOGE-USDC': 'DOGE-USD',
    'ADA-USDC': 'ADA-USD',
    'TSLA': 'TSLA',
    'NVDA': 'NVDA',
    'META': 'META',
    'PLTR': 'PLTR',
    'SNOW': 'SNOW',
    'UBER': 'UBER',
    'HOOD': 'HOOD',
    'ABNB': 'ABNB',
  };
  return map[market] || market;
}

// Fetch latest price from Yahoo Finance
async function fetchYahooPrice(market) {
  const symbol = getYahooSymbol(market);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const price = result.meta?.regularMarketPrice || result.meta?.previousClose || null;
    return price;
  } catch (err) {
    console.error(`[OrderBook] Failed to fetch Yahoo price for ${market}:`, err);
    return null;
  }
}

// Random walk state for each market
const randomWalkState = {};

// Simulate a random walk around the real price
function randomWalkPrice(market, realPrice) {
  if (!randomWalkState[market]) {
    randomWalkState[market] = realPrice;
    return realPrice;
  }
  // Walk by up to ±0.2% per step
  const maxStep = realPrice * 0.002;
  const step = (Math.random() - 0.5) * 2 * maxStep;
  let newPrice = randomWalkState[market] + step;
  // Clamp to ±2% of real price
  const min = realPrice * 0.98;
  const max = realPrice * 1.02;
  newPrice = Math.max(min, Math.min(max, newPrice));
  randomWalkState[market] = newPrice;
  return newPrice;
}

// Periodically update the order book with random walk prices
async function updateOrderBooksWithRandomWalk() {
  for (const market of Object.keys(SUPPORTED_MARKETS)) {
    // Only update if not using real exchange feed
    if (process.env.ENABLE_BINANCE === 'true' || process.env.ENABLE_COINBASE === 'true') continue;
    const ob = orderBooks.get(market);
    if (!ob) continue;
    const realPrice = await fetchYahooPrice(market);
    if (!realPrice) continue;
    // Clear existing mock orders
    ob.clear();
    const spread = realPrice * 0.001; // 0.1% spread
    // Add bid levels
    for (let i = 1; i <= 10; i++) {
      const price = randomWalkPrice(market, realPrice) - (spread * i);
      const size = Math.random() * 5 + 0.1;
      await placeOrder(market, {
        id: `RW-BID-${market}-${i}-${Date.now()}`,
        side: 'buy',
        price: price,
        size: size,
        type: 'limit'
      });
    }
    // Add ask levels
    for (let i = 1; i <= 10; i++) {
      const price = randomWalkPrice(market, realPrice) + (spread * i);
      const size = Math.random() * 5 + 0.1;
      await placeOrder(market, {
        id: `RW-ASK-${market}-${i}-${Date.now()}`,
        side: 'sell',
        price: price,
        size: size,
        type: 'limit'
      });
    }
    console.log(`[OrderBook] Updated ${market} with random walk around $${realPrice}`);
  }
}

// Start periodic update every 5 seconds
setInterval(updateOrderBooksWithRandomWalk, 5000);

// Public API
module.exports = {
  SUPPORTED_MARKETS,
  MARKET_ID_MAP,
  orderBooks,
  ready,
  
  placeOrder,
  
  async cancelOrder(market, id) {
    const ob = orderBooks.get(market);
    if (!ob) {
      throw new Error(`Market ${market} not supported`);
    }
    
    const removed = ob.cancel(id);
    if (removed && removed.log) {
      await persistLog(market, removed.log);
      await maybeSnapshot(market);
    }
    return removed;
  },
  
  depth(market, level = 20) {
    const ob = orderBooks.get(market);
    if (!ob) {
      console.warn(`[OrderBook] Market ${market} not found, returning empty depth`);
      return { asks: [], bids: [] };
    }
    
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
  
  // Helper to get market from marketId
  getMarketFromId(marketId) {
    const market = MARKET_ID_MAP[marketId] || 'BTC-USDC';
    console.log(`[OrderBook] getMarketFromId(${marketId}) -> ${market}`);
    return market;
  }
}; 