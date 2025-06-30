require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const { placeOrder, cancelOrder, depth, ready } = require('./orderBook');
const binanceWorker = require('./binanceWorker');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(bodyParser.json());
app.use(require('cors')());

// REST endpoints
app.get('/api/depth', (req, res) => {
  const level = Number(req.query.level) || 10;
  res.json(depth(level));
});

app.post('/api/orders', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Missing X-User-Id header' });

    const { side, price, size, type = 'limit' } = req.body;
    if (!side || !size) {
      return res.status(400).json({ error: 'side and size are required' });
    }
    const id = uuidv4();
    const result = await placeOrder({ id, side, price, size, type });
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
    const removed = cancelOrder(req.params.id);
    if (removed) return res.json({ removed });
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);

// WebSocket server for public depth updates
const wss = new WebSocket.Server({ server, path: '/ws/depth' });

// Private notifications
const wssPrivate = new WebSocket.Server({ server, path: '/ws/private' });
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
  const snapshot = depth(20);
  const payload = JSON.stringify({ type: 'depth', data: snapshot });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
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
// We'll process in API call result above
function processMatches(result) {
  if (!result || !result.done) return;
  result.done.forEach((match) => {
    const makerUser = orderOwner.get(match.makerOrderId);
    const takerUser = orderOwner.get(match.takerOrderId);
    if (makerUser) broadcastFill(makerUser, match);
    if (takerUser) broadcastFill(takerUser, match);
  });
}

// Start external worker
ready.then(() => {
  binanceWorker.start();
});

server.listen(PORT, () => {
  console.log(`Matching engine server listening on http://localhost:${PORT}`);
}); 