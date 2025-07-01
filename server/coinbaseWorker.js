const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const { placeOrder, cancelOrder } = require('./orderBook');

const WS_URL = 'wss://ws-feed.exchange.coinbase.com';
const PRODUCT_ID = process.env.COINBASE_PRODUCT || 'BTC-USD';

// Map Coinbase products to our internal market format
const COINBASE_TO_MARKET = {
  'BTC-USD': 'BTC-USDC',
  'ETH-USD': 'ETH-USDC',
  'SOL-USD': 'SOL-USDC'
};

const MARKET = COINBASE_TO_MARKET[PRODUCT_ID] || 'BTC-USDC';

// Maintain remaining size per price for both sides to sync deltas
const asks = new Map();
const bids = new Map();
const priceOrders = { buy: new Map(), sell: new Map() };

// fallback mock liquidity generator
function mockLevels() {
  const base = 30000;
  const levels = [];
  for (let i = 1; i <= 5; i++) {
    levels.push([base - i * 100, 0.1 * i, 'buy']);
    levels.push([base + i * 100, 0.1 * i, 'sell']);
  }
  return levels;
}

let lastUpdate = 0;
let seededMock = false;

async function syncLevels(side, price, newQty) {
  const map = side === 'sell' ? asks : bids;
  const prevQty = map.get(price) || 0;
  const delta = newQty - prevQty;
  if (delta === 0) return;

  if (delta > 0) {
    const id = `CB-${side.toUpperCase()}-${price}-${uuidv4()}`;
    await placeOrder(MARKET, {
      id,
      side,
      price: Number(price),
      size: delta,
      type: 'limit',
      tag: { venue: 'COINBASE' },
    });
    map.set(price, newQty);
    if (!priceOrders[side].has(price)) priceOrders[side].set(price, []);
    priceOrders[side].get(price).push({ id, size: delta });
  } else {
    // Need to reduce quantity
    let toRemove = -delta;
    const arr = priceOrders[side].get(price) || [];
    while (toRemove > 0 && arr.length) {
      const o = arr[0];
      await cancelOrder(MARKET, o.id);
      toRemove -= o.size;
      arr.shift();
    }
    if (arr.length) priceOrders[side].set(price, arr);
    else priceOrders[side].delete(price);
    map.set(price, newQty);
  }
}

function start() {
  const ws = new WebSocket(WS_URL);
  ws.on('open', () => {
    console.log('[CoinbaseWorker] connected');
    ws.send(
      JSON.stringify({
        type: 'subscribe',
        product_ids: [PRODUCT_ID],
        channels: ['level2'],
      })
    );
  });

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'snapshot') {
        lastUpdate = Date.now();
        for (const [price, size] of msg.bids) {
          await syncLevels('buy', price, parseFloat(size));
        }
        for (const [price, size] of msg.asks) {
          await syncLevels('sell', price, parseFloat(size));
        }
      }
      if (msg.type === 'l2update') {
        lastUpdate = Date.now();
        for (const [sideStr, price, sizeStr] of msg.changes) {
          const side = sideStr === 'buy' ? 'buy' : 'sell';
          await syncLevels(side, price, parseFloat(sizeStr));
        }
      }
      // When real data received, don't need mock
      seededMock = false;
    } catch (err) {
      console.error('[CoinbaseWorker] message error', err);
    }
  });

  ws.on('close', () => {
    console.log('[CoinbaseWorker] closed, reconnecting in 5s');
    setTimeout(start, 5000);
  });
  ws.on('error', (err) => console.error('[CoinbaseWorker] error', err));

  // Hybrid fallback checker
  setInterval(async () => {
    const now = Date.now();
    if (now - lastUpdate > 4000 && !seededMock) {
      console.log('[CoinbaseWorker] No live data, seeding mock liquidity');
      for (const [price, size, side] of mockLevels()) {
        await syncLevels(side, price, size);
      }
      seededMock = true;
    }
  }, 4000);
}

module.exports = { start }; 