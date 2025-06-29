const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (req, res) => {
    // The target URL for the proxy
    const target = 'https://query1.finance.yahoo.com';

    // Create a proxy instance
    const proxy = createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: {
            // remove /api from the start of the path
            '^/api': '',
        },
        onProxyReq: (proxyReq) => {
            // Set the User-Agent header
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log(`[Proxy] Request to ${req.url} responded with status ${proxyRes.statusCode}`);
        },
        onError: (err, req, res) => {
            console.error('Proxy Error:', err);
            res.status(500).send('Proxy Error');
        }
    });

    // Forward the request to the proxy
    proxy(req, res);
}; 