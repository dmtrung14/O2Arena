const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const { placeOrder, cancelOrder } = require('./orderBook');

const WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@depth@100ms';

// For educational purposes, we can disable real Binance data
const ENABLE_BINANCE = process.env.ENABLE_BINANCE === 'true';

// Maintain per price level remaining size
const asks = new Map(); // price -> remaining qty (number)
const bids = new Map();
const priceOrders = {
  buy: new Map(), // price -> array of {id,size}
  sell: new Map(),
};

// Mock data generator for educational use
function injectMockLiquidity() {
  if (ENABLE_BINANCE) return; // Skip if using real Binance
  
  console.log('[BinanceWorker] Injecting mock educational liquidity');
  
  // Generate some fake bid/ask levels around 100k
  const basePrice = 100000;
  const levels = [
    // Bids (buy side)
    [basePrice - 1000, 0.5],
    [basePrice - 2000, 1.0],
    [basePrice - 3000, 2.0],
    [basePrice - 5000, 5.0],
    // Asks (sell side)  
    [basePrice + 1000, 0.5],
    [basePrice + 2000, 1.0], 
    [basePrice + 3000, 2.0],
    [basePrice + 5000, 5.0],
  ];
  
  levels.forEach(([price, size], i) => {
    const side = i < 4 ? 'buy' : 'sell';
    const id = `MOCK-${side.toUpperCase()}-${price}-${Date.now()}`;
    
    placeOrder({
      id,
      side,
      price,
      size,
      type: 'limit',
      tag: { venue: 'MOCK_EDUCATIONAL' },
    }).catch(err => console.error('[MockLiquidity] error', err));
  });
}

async function syncLevels(side, price, newQty) {
  const map = side === 'sell' ? asks : bids;
  const prevQty = map.get(price) || 0;
  const delta = newQty - prevQty;
  if (delta === 0) return;

  if (delta > 0) {
    // inject synthetic order for the delta
    const id = `${side.toUpperCase()}-${price}-${uuidv4()}`;
    await placeOrder({
      id,
      side,
      price: Number(price),
      size: delta,
      type: 'limit',
      tag: { venue: 'BINANCE' },
    });
    map.set(price, newQty);
    if (!priceOrders[side].has(price)) priceOrders[side].set(price, []);
    priceOrders[side].get(price).push({ id, size: delta });
  } else {
    // delta negative => need to reduce
    let toRemove = -delta;
    const ordersArr = priceOrders[side].get(price) || [];
    while (toRemove > 0 && ordersArr.length) {
      const o = ordersArr[0];
      if (o.size <= toRemove) {
        await cancelOrder(o.id);
        toRemove -= o.size;
        ordersArr.shift();
      } else {
        // partial cancel: reduce sizes tracking
        await cancelOrder(o.id); // simplest: cancel entire order
        toRemove -= o.size;
        ordersArr.shift();
      }
    }
    if (ordersArr.length === 0) {
      priceOrders[side].delete(price);
    } else {
      priceOrders[side].set(price, ordersArr);
    }
    map.set(price, newQty);
  }
}

function start() {
  if (!ENABLE_BINANCE) {
    console.log('[BinanceWorker] Educational mode - using mock data instead of real Binance');
    setTimeout(injectMockLiquidity, 2000); // Give orderbook time to initialize
    return;
  }

  console.log('[BinanceWorker] Connecting to real Binance WebSocket');
  const ws = new WebSocket(WS_URL);
  ws.on('open', () => console.log('[BinanceWorker] connected'));
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.b || msg.a) {
        const updBids = msg.b; // [price, qty]
        const updAsks = msg.a;
        (async () => {
          for (const [priceStr, qtyStr] of updBids) {
            const p = priceStr;
            const q = parseFloat(qtyStr);
            await syncLevels('buy', p, q === 0 ? 0 : q);
          }
          for (const [priceStr, qtyStr] of updAsks) {
            const p = priceStr;
            const q = parseFloat(qtyStr);
            await syncLevels('sell', p, q === 0 ? 0 : q);
          }
        })().catch((e) => console.error('[BinanceWorker] sync error', e));
      }
    } catch (err) {
      console.error('[BinanceWorker] message error', err);
    }
  });
  ws.on('close', () => {
    console.log('[BinanceWorker] closed, reconnecting in 5s');
    setTimeout(start, 5000);
  });
  ws.on('error', (err) => console.error('[BinanceWorker] error', err));
}

module.exports = { start }; 