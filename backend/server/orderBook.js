const { OrderBook } = require('nodejs-order-book');
const yahooFinance = require('yahoo-finance2').default;

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
let basePrices = {};

function initMarket(market) {
  const ob = new OrderBook();
  orderBooks.set(market, ob);
  
  console.log(`[OrderBook] Initialized market: ${market}`);
  
  addMockLiquidity(market);
  
  return ob;
}

async function fetchBasePrices() {
  // Start with a set of fallback prices.
  const prices = {
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

  const symbolsToFetch = Object.keys(SUPPORTED_MARKETS);
  const yahooSymbols = symbolsToFetch.map(s => {
    if (s.includes('-')) return s.replace('-USDC', '-USD');
    return s;
  });

  // Create a reverse map to reliably associate results with our internal symbols.
  const yahooToInternalSymbolMap = {};
  for (let i = 0; i < symbolsToFetch.length; i++) {
    yahooToInternalSymbolMap[yahooSymbols[i]] = symbolsToFetch[i];
  }

  try {
    console.log('[OrderBook] Fetching prices from Yahoo Finance for symbols:', yahooSymbols);
    const quotes = await yahooFinance.quote(yahooSymbols);
    // Ensure we're always working with an array.
    const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

    for (const quote of quotesArray) {
      if (quote && quote.regularMarketPrice) {
        const internalSymbol = yahooToInternalSymbolMap[quote.symbol];
        if (internalSymbol) {
          prices[internalSymbol] = quote.regularMarketPrice;
          console.log(`[OrderBook] Fetched price for ${internalSymbol}: ${quote.regularMarketPrice}`);
        }
      }
    }
  } catch (error) {
    console.error('[OrderBook] Failed to fetch prices from Yahoo Finance. Using only fallback data.', error.message);
  }

  return prices;
}

function addMockLiquidity(market) {
  const ob = orderBooks.get(market);
  if (!ob) return;
  
  const basePrice = basePrices[market] || 100;
  const spread = basePrice * 0.001; // 0.1% spread
  
  console.log(`[OrderBook] Adding mock liquidity for ${market} around $${basePrice}`);
  
  // Add bid levels (buy orders)
  for (let i = 1; i <= 10; i++) {
    const price = basePrice - (spread * i);
    const size = Math.random() * 5 + 0.1;
    
    try {
      placeOrder(market, {
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
      placeOrder(market, {
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
  console.log('[OrderBook] Fetching initial prices...');
  basePrices = await fetchBasePrices();
  console.log('[OrderBook] Initializing all markets...');
  for (const market of Object.keys(SUPPORTED_MARKETS)) {
    initMarket(market);
  }
  console.log('[OrderBook] All markets initialized');
})();

function placeOrder(market, params) {
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
    
    return result;
  } catch (err) {
    console.error(`[OrderBook] placeOrder error for ${market}`, err);
    throw err;
  }
}

// Public API
module.exports = {
  SUPPORTED_MARKETS,
  MARKET_ID_MAP,
  orderBooks,
  ready,
  
  placeOrder,
  
  cancelOrder(market, id) {
    const ob = orderBooks.get(market);
    if (!ob) {
      throw new Error(`Market ${market} not supported`);
    }
    
    const removed = ob.cancel(id);
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