const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// This allows your React app at localhost:3000 to make requests to this server
app.use(cors({ origin: 'http://localhost:3000' }));

const yahooProxy = createProxyMiddleware({
  target: 'https://query1.finance.yahoo.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // remove /api prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Yahoo Finance API requires a user-agent header
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('[Proxy Server] Received response from Yahoo with status:', proxyRes.statusCode);
  },
  onError: (err, req, res) => {
    console.error('[Proxy Server] Proxy Error:', err);
    res.status(500).send('Proxy Error');
  }
});

app.use('/api', yahooProxy);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server is running on http://localhost:${PORT}`);
}); 