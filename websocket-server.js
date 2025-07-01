// websocket-server.js
//
// Standalone matching engine + WebSocket server for deployment to Render/Railway/Heroku.
// To deploy:
//   1. Push this file and the server/ directory to a new repo or subfolder.
//   2. Set the start command to: node websocket-server.js
//   3. Set environment variables as needed (e.g., PORT, ENABLE_BINANCE).
//   4. Deploy to Render/Railway/Heroku as a Node.js web service.
//
// The server will listen on process.env.PORT (default 4000) and expose:
//   - REST API:    http://<host>:<port>/api/depth
//   - WebSockets:  ws://<host>:<port>/ws/depth?market_id=4

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

const { placeOrder, cancelOrder, depth, ready, getMarketFromId } = require('./server/orderBook');
const binanceWorker = require('./server/binanceWorker');
const coinbaseWorker = require('./server/coinbaseWorker');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(bodyParser.json());
app.use(require('cors')());

// REST endpoints
app.get('/api/depth', (req, res) => {
  const level = Number(req.query.level) || 20;
  const marketId = req.query.market_id;
  const market = marketId ? getMarketFromId(Number(marketId)) : 'BTC-USDC';
  const result = depth(market, level);
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

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const marketId = url.searchParams.get('market_id');
  const market = marketId ? getMarketFromId(Number(marketId)) : 'BTC-USDC';
  const snapshot = depth(market, 20);
  ws.send(JSON.stringify({ type: 'depth', data: snapshot, market }));
  ws.market = market;
  ws.on('close', () => {});
  ws.on('error', (err) => {});
});

server.on('upgrade', (req, socket, head) => {
  const { url } = req;
  if (url.startsWith('/ws/depth')) {
    wss.handleUpgrade(req, socket, head, (wsClient) => {
      wss.emit('connection', wsClient, req);
    });
  } else if (url.startsWith('/ws/private')) {
    wssPrivate.handleUpgrade(req, socket, head, (wsClient) => {
      wssPrivate.emit('connection', wsClient, req);
    });
  } else {
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

ready.then(() => {
  if (process.env.ENABLE_BINANCE === 'true') {
    binanceWorker.start();
  } else {
    coinbaseWorker.start();
  }
});

server.listen(PORT, () => {
  console.log(`Matching engine server listening on http://localhost:${PORT}`);
  console.log('WebSocket: ws://localhost:' + PORT + '/ws/depth?market_id=4 (for BTC)');
  console.log('REST API: http://localhost:' + PORT + '/api/depth?market_id=4');
}); 