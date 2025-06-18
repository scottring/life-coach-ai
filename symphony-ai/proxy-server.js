const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Create proxy middleware
const proxy = createProxyMiddleware({
  target: 'https://n8n.srv829884.hstgr.cloud',
  changeOrigin: true,
  pathRewrite: {
    '^/api/n8n': '', // remove /api/n8n prefix
  },
});

// Use the proxy
app.use('/api/n8n', proxy);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`n8n webhook available at: http://localhost:${PORT}/api/n8n/webhook/meal-plan`);
});