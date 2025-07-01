require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// Map orderId -> userId (simple in-memory)
const orderOwner = new Map();
// userId -> Set<WebSocket>
const privateClients = new Map();

const { placeOrder, cancelOrder, depth, ready, getMarketFromId } = require('./orderBook');
const binanceWorker = require('./binanceWorker');
const coinbaseWorker = require('./coinbaseWorker');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(bodyParser.json());
app.use(require('cors')());

// REST endpoints
app.get('/api/depth', (req, res) => {
  const level = Number(req.query.level) || 20;
  const marketId = req.query.market_id;
  
  // Get market symbol from marketId or default to BTC-USDC
  const market = marketId ? getMarketFromId(Number(marketId)) : 'BTC-USDC';
  
  console.log(`[API] Depth request - marketId: ${marketId} -> market: ${market}`);
  
  const result = depth(market, level);
  console.log(`[API] Returning depth for ${market} with ${result.asks.length} asks, ${result.bids.length} bids`);
  
  res.json(result);
});

app.post('/api/orders', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Missing X-User-Id header' });

    const { side, price, size, type = 'limit', market = 'BTC-USDC' } = req.body;
    if (!side || !size) {
      return res.status(400).json({ error: 'side and size are required' });
    }
    
    const id = uuidv4();
    const result = await placeOrder(market, { id, side, price, size, type });
    orderOwner.set(id, userId);
    processMatches(result);
    res.json({ id, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Missing X-User-Id header' });
    
    const { market = 'BTC-USDC' } = req.query;
    const removed = await cancelOrder(market, req.params.id);
    if (removed) return res.json({ removed });
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);

// WebSocket server for public depth updates
const wss = new WebSocket.Server({ noServer: true });

// Private notifications WebSocket server
const wssPrivate = new WebSocket.Server({ noServer: true });

// Handle public depth connections
wss.on('connection', (ws, req) => {
  console.log('Client connected to depth feed');
  
  // Extract market from query parameters if provided
  const url = new URL(req.url, `http://${req.headers.host}`);
  const marketId = url.searchParams.get('market_id');
  const market = marketId ? getMarketFromId(Number(marketId)) : 'BTC-USDC';
  
  console.log(`[WebSocket] Client connected - marketId: ${marketId} -> market: ${market}`);
  
  // Send initial snapshot for the requested market
  const snapshot = depth(market, 20);
  console.log(`[WebSocket] Sending initial snapshot for ${market} with ${snapshot.asks.length} asks, ${snapshot.bids.length} bids`);
  ws.send(JSON.stringify({ type: 'depth', data: snapshot, market }));
  
  // Store market info on the WebSocket for later use
  ws.market = market;
  
  ws.on('close', () => {
    console.log(`Client disconnected from depth feed for ${market}`);
  });
  
  ws.on('error', (err) => {
    console.log('Depth WebSocket error:', err);
  });
});

// Handle upgrade manually so we can use same HTTP port for any WS endpoint
server.on('upgrade', (req, socket, head) => {
  const { url } = req;
  console.log(`WebSocket upgrade request to: ${url}`);
  
  if (url.startsWith('/ws/depth')) {
    wss.handleUpgrade(req, socket, head, (wsClient) => {
      console.log('WebSocket connected to /ws/depth');
      wss.emit('connection', wsClient, req);
    });
  } else if (url.startsWith('/ws/private')) {
    wssPrivate.handleUpgrade(req, socket, head, (wsClient) => {
      console.log('WebSocket connected to /ws/private');
      wssPrivate.emit('connection', wsClient, req);
    });
  } else {
    console.log(`Rejecting WebSocket connection to ${url}`);
    socket.destroy();
  }
});

wssPrivate.on('connection', (ws, req) => {
  const userId = req.headers['x-user-id'] || new URLSearchParams(req.url.split('?')[1] || '').get('user');
  if (!userId) {
    ws.close();
    return;
  }
  if (!privateClients.has(userId)) privateClients.set(userId, new Set());
  privateClients.get(userId).add(ws);
  ws.on('close', () => {
    privateClients.get(userId).delete(ws);
  });
});

function broadcastDepth() {
  // Broadcast depth for all markets to respective clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const market = client.market || 'BTC-USDC';
      const snapshot = depth(market, 20);
      const payload = JSON.stringify({ type: 'depth', data: snapshot, market });
      client.send(payload);
    }
  });
}

function broadcastFill(userId, fill) {
  const clients = privateClients.get(userId);
  if (!clients) return;
  const payload = JSON.stringify({ type: 'fill', data: fill });
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}

// Hook into orderBook matches by monkey-patching placeOrder result processing
function processMatches(result) {
  if (!result || !result.done) return;
  result.done.forEach((match) => {
    const makerUser = orderOwner.get(match.makerOrderId);
    const takerUser = orderOwner.get(match.takerOrderId);
    if (makerUser) broadcastFill(makerUser, match);
    if (takerUser) broadcastFill(takerUser, match);
  });
}

setInterval(broadcastDepth, 1000); // every second

// Start external workers
ready.then(() => {
  console.log('[Server] OrderBook ready, starting external data workers...');
  if (process.env.ENABLE_BINANCE === 'true') {
    binanceWorker.start();
  } else {
    coinbaseWorker.start();
  }
});

server.listen(PORT, () => {
  console.log(`Matching engine server listening on http://localhost:${PORT}`);
  console.log('Supported markets:');
  console.log('  Crypto: BTC-USDC, ETH-USDC, SOL-USDC, DOGE-USDC, ADA-USDC');
  console.log('  Stocks: TSLA, NVDA, META, PLTR, SNOW, UBER, HOOD, ABNB');
  console.log('WebSocket: ws://localhost:' + PORT + '/ws/depth?market_id=4 (for BTC)');
  console.log('REST API: http://localhost:' + PORT + '/api/depth?market_id=4');
}); 