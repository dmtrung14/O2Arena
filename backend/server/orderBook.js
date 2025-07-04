const { v4: uuidv4 } = require('uuid');
const yahooFinance = require('yahoo-finance2').default;

class OrderBook {
  constructor() {
    this.bids = []; // Buy orders, sorted high to low
    this.asks = []; // Sell orders, sorted low to high
  }

  addOrder(order) {
    const orderWithTimestamp = {
      ...order,
      id: order.id || uuidv4(),
      timestamp: Date.now(),
      size: parseFloat(order.size),
      price: order.price ? parseFloat(order.price) : undefined,
    };

    if (orderWithTimestamp.type === 'market') {
      return this._matchMarketOrder(orderWithTimestamp);
    } else {
      return this._addLimitOrder(orderWithTimestamp);
    }
  }
  
  _addLimitOrder(order) {
    const book = order.side === 'buy' ? this.bids : this.asks;
    book.push(order);

    if (order.side === 'buy') {
      book.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
    } else {
      book.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);
    }
    
    // After adding, immediately try to match.
    console.log(`[OrderBook] Added limit order ${order.id}, crossing book.`);
    
    // Try to cross the book and get any matches
    const matchResult = this._crossBook();
    
    // Check if the order we just added is still in the book (meaning it wasn't fully filled)
    const orderStillExists = book.find(o => o.id === order.id);
    
    if (orderStillExists) {
      // Order is pending (partially filled or not filled at all)
      return {
        done: matchResult.done,
        pending: orderStillExists,
        partial: matchResult.partial
      };
    } else {
      // Order was completely filled
      return matchResult;
    }
  }

  _matchLimitOrder(order) {
    // This function is now deprecated in favor of _crossBook,
    // but we'll keep it for now to avoid breaking other parts of the system
    // that might still be calling it. It will simply add the order.
    return this._addLimitOrder(order);
  }
  
  _matchMarketOrder(order) {
    const trades = [];
    const partialFills = [];
    let remainingSize = order.size;
    const bookToMatch = order.side === 'buy' ? this.asks : this.bids;
    
    const bestPrice = bookToMatch.length > 0 ? bookToMatch[0].price : -1;

    for (let i = 0; i < bookToMatch.length && remainingSize > 0; ) {
      const bestMatch = bookToMatch[i];
      
      // More robust slippage protection for market orders.
      if (bestPrice > 0) {
        const priceImpact = Math.abs(bestMatch.price - bestPrice) / bestPrice;
        if (priceImpact > 0.05) { // 5% slippage limit
            console.log(`[OrderBook] Market order ${order.id} stopped due to high price impact. Impact: ${priceImpact.toFixed(4)}`);
            break;
        }
      }

      const tradeSize = Math.min(remainingSize, bestMatch.size);
      
      const trade = {
        takerOrderId: order.id,
        makerOrderId: bestMatch.id,
        price: bestMatch.price,
        size: tradeSize,
        timestamp: Date.now(),
      };
      trades.push(trade);

      remainingSize -= tradeSize;
      bestMatch.size -= tradeSize;

      if (bestMatch.size === 0) {
        bookToMatch.splice(i, 1);
      } else {
        partialFills.push({ orderId: bestMatch.id, filledSize: tradeSize });
        i++;
      }
    }

    return {
        done: trades,
        pending: null,
        partial: partialFills.length > 0 ? partialFills : null,
        remainingSize: remainingSize,
    };
  }

  // New function to cross the book and find matches
  _crossBook() {
    const trades = [];
    const partialFills = [];
    
    console.log(`[CrossBook] Checking for matches. Bids: ${this.bids.length}, Asks: ${this.asks.length}`);
    
    // Log the best bid and ask for debugging
    if (this.bids.length > 0 && this.asks.length > 0) {
      console.log(`[CrossBook] Best Bid: ${this.bids[0].price} | Best Ask: ${this.asks[0].price} | Can Match: ${this.bids[0].price >= this.asks[0].price}`);
    }

    while (this.bids.length > 0 && this.asks.length > 0 && this.bids[0].price >= this.asks[0].price) {
      const bestBid = this.bids[0];
      const bestAsk = this.asks[0];
      
      console.log(`[CrossBook] ✅ Match found! Bid Price: ${bestBid.price}, Ask Price: ${bestAsk.price}`);

      const tradeSize = Math.min(bestBid.size, bestAsk.size);
      const tradePrice = bestBid.timestamp < bestAsk.timestamp ? bestBid.price : bestAsk.price;

      console.log(`[CrossBook] Trade Details - Size: ${tradeSize}, Price: ${tradePrice}`);

      const trade = {
        takerOrderId: bestBid.timestamp > bestAsk.timestamp ? bestBid.id : bestAsk.id,
        makerOrderId: bestBid.timestamp < bestAsk.timestamp ? bestBid.id : bestAsk.id,
        price: tradePrice,
        size: tradeSize,
        timestamp: Date.now(),
      };
      trades.push(trade);

      // Track partial fills before reducing sizes
      const bidSizeBeforeTrade = bestBid.size;
      const askSizeBeforeTrade = bestAsk.size;

      bestBid.size -= tradeSize;
      bestAsk.size -= tradeSize;
      
      if (bestBid.size <= 1e-9) { // Use a small epsilon for float comparison
        this.bids.shift();
        console.log(`[CrossBook] Bid order ${bestBid.id} filled and removed.`);
      } else {
        // Bid was partially filled
        partialFills.push({ orderId: bestBid.id, filledSize: tradeSize, remainingSize: bestBid.size });
        console.log(`[CrossBook] Bid order ${bestBid.id} partially filled: ${tradeSize}/${bidSizeBeforeTrade}`);
      }
      
      if (bestAsk.size <= 1e-9) {
        this.asks.shift();
        console.log(`[CrossBook] Ask order ${bestAsk.id} filled and removed.`);
      } else {
        // Ask was partially filled
        partialFills.push({ orderId: bestAsk.id, filledSize: tradeSize, remainingSize: bestAsk.size });
        console.log(`[CrossBook] Ask order ${bestAsk.id} partially filled: ${tradeSize}/${askSizeBeforeTrade}`);
      }
    }

    console.log(`[CrossBook] ✅ Completed crossing. Total trades: ${trades.length}, Partial fills: ${partialFills.length}`);
    return { 
      done: trades, 
      pending: null, 
      partial: partialFills.length > 0 ? partialFills : null 
    };
  }

  cancelOrder(orderId) {
    let order = null;
    let index = this.asks.findIndex(o => o.id === orderId);
    if (index !== -1) {
      order = this.asks[index];
      this.asks.splice(index, 1);
      return order;
    }

    index = this.bids.findIndex(o => o.id === orderId);
    if (index !== -1) {
      order = this.bids[index];
      this.bids.splice(index, 1);
      return order;
    }
    
    return null;
  }

  getDepth(level = 20) {
    const asks = this.asks
      .slice(0, level)
      .map(o => [o.price, o.size]);
    const bids = this.bids
      .slice(0, level)
      .map(o => [o.price, o.size]);
    return { asks, bids };
  }
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
let basePrices = {};

function initMarket(market) {
  const ob = new OrderBook();
  orderBooks.set(market, ob);
  
  console.log(`[OrderBook] Initialized market: ${market}`);
  
  addMockLiquidity(market);
  
  return ob;
}

function addMockLiquidity(market) {
  const ob = orderBooks.get(market);
  if (!ob) return;

  // Get proper fallback prices for each market
  const fallbackPrices = {
    'BTC-USDC': 100000,
    'ETH-USDC': 3500,
    'SOL-USDC': 200,
    'DOGE-USDC': 0.35,
    'ADA-USDC': 1.2,
    'TSLA': 350,
    'NVDA': 140,
    'META': 580,
    'PLTR': 45,
    'SNOW': 120,
    'UBER': 85,
    'HOOD': 25,
    'ABNB': 160
  };

  const basePrice = basePrices[market] || fallbackPrices[market] || 100;
  
  console.log(`[OrderBook] Adding mock liquidity for ${market} at base price: ${basePrice}`);
  
  // Simplified liquidity for now.
  for (let i = 1; i <= 10; i++) {
    const spread = basePrice * 0.001 * i;
    const size = 10 / i;

    ob.addOrder({ side: 'buy', type: 'limit', price: basePrice - spread, size: size });
    ob.addOrder({ side: 'sell', type: 'limit', price: basePrice + spread, size: size });
  }
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

  const yahooToInternalSymbolMap = {};
  for (let i = 0; i < symbolsToFetch.length; i++) {
    yahooToInternalSymbolMap[yahooSymbols[i]] = symbolsToFetch[i];
  }

  try {
    console.log('[OrderBook] Fetching prices from Yahoo Finance for symbols:', yahooSymbols);
    const quotes = await yahooFinance.quote(yahooSymbols);
    const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

    for (const quote of quotesArray) {
      if (quote && quote.regularMarketPrice) {
        const internalSymbol = yahooToInternalSymbolMap[quote.symbol];
        if (internalSymbol) {
          prices[internalSymbol] = quote.regularMarketPrice;
          console.log(`[OrderBook] Fetched price for ${internalSymbol}: ${quote.regularMarketPrice}`);
          if (internalSymbol) {
            basePrices[internalSymbol] = quote.regularMarketPrice;
          }
        }
      }
    }
  } catch (error) {
    console.error('[OrderBook] Failed to fetch prices from Yahoo Finance. Using only fallback data.', error.message);
  }

  console.log('[OrderBook] Updated base prices:', basePrices);
  
  // After updating prices, try to cross all books.
  for (const market of orderBooks.keys()) {
      const ob = orderBooks.get(market);
      if(ob) {
          ob._crossBook();
      }
  }
}

// =================================================================
// Public API for the order book
// =================================================================

function placeOrder(market, params) {
  const ob = orderBooks.get(market);
  if (!ob) {
    throw new Error(`Market ${market} not supported`);
  }
  
  console.log(`[PlaceOrder] ${market} - ${params.side} ${params.size} @ ${params.price || 'market'} (Type: ${params.type || 'limit'})`);
  
  // Log current best bid/ask before placing order
  const currentDepth = ob.getDepth(1);
  console.log(`[PlaceOrder] Current Book - Best Bid: ${currentDepth.bids[0]?.[0] || 'none'}, Best Ask: ${currentDepth.asks[0]?.[0] || 'none'}`);
  
  const result = ob.addOrder(params);
  
  if (result.done && result.done.length > 0) {
    console.log(`[PlaceOrder] ✅ Order resulted in ${result.done.length} trades`);
    result.done.forEach(trade => {
      console.log(`[PlaceOrder] Trade: ${trade.size} @ ${trade.price}`);
    });
  } else {
    console.log(`[PlaceOrder] Order added to book without immediate matches`);
  }
  
  return result;
}

function cancelOrder(market, id) {
  const ob = orderBooks.get(market);
  if (!ob) {
    throw new Error(`Market ${market} not supported`);
  }
  return ob.cancelOrder(id);
}

function depth(market, level = 20) {
  const ob = orderBooks.get(market);
  if (!ob) {
    console.warn(`[OrderBook] Market ${market} not found, returning empty depth`);
    return { asks: [], bids: [] };
  }
  return ob.getDepth(level);
}

function getMarketFromId(marketId) {
  return MARKET_ID_MAP[marketId] || 'BTC-USDC';
}

function clearMarket(market) {
  const ob = orderBooks.get(market);
  if (ob) {
    ob.bids = [];
    ob.asks = [];
    console.log(`[OrderBook] Cleared all orders for market: ${market}`);
  }
}

function clearAllMarkets() {
  for (const market of orderBooks.keys()) {
    clearMarket(market);
  }
  console.log('[OrderBook] All markets cleared');
}

// Periodically update prices and cross the books
setInterval(fetchBasePrices, 5 * 60 * 1000); // 5 minutes

// Initial price fetch and market initialization
(async () => {
    console.log('[OrderBook] Fetching initial prices...');
    await fetchBasePrices();
    console.log('[OrderBook] Initializing all markets...');
    for (const market of Object.keys(SUPPORTED_MARKETS)) {
        initMarket(market);
    }
    console.log('[OrderBook] All markets initialized');
})();

function getUserOrders(userId, orderOwnerMap) {
  const userOrders = [];
  
  // Search through all markets
  for (const [market, orderBook] of orderBooks.entries()) {
    // Check bids
    orderBook.bids.forEach(order => {
      if (orderOwnerMap && orderOwnerMap.get(order.id) === userId) {
        userOrders.push({
          ...order,
          market,
          side: 'buy'
        });
      }
    });
    
    // Check asks
    orderBook.asks.forEach(order => {
      if (orderOwnerMap && orderOwnerMap.get(order.id) === userId) {
        userOrders.push({
          ...order,
          market,
          side: 'sell'
        });
      }
    });
  }
  
  // Sort by timestamp (newest first)
  return userOrders.sort((a, b) => b.timestamp - a.timestamp);
}

module.exports = {
  SUPPORTED_MARKETS,
  MARKET_ID_MAP,
  orderBooks,
  initMarket,
  placeOrder,
  cancelOrder,
  depth,
  getMarketFromId,
  clearMarket,
  clearAllMarkets,
  getUserOrders,
}; 