// API Configuration for different environments

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === 'production';

// Development URLs (localhost)
const DEVELOPMENT_CONFIG = {
  MATCHING_ENGINE_URL: 'http://localhost:4000',
  WS_URL: 'ws://localhost:4000'
};

// Production URLs (deployed)
const PRODUCTION_CONFIG = {
  MATCHING_ENGINE_URL: process.env.REACT_APP_API_URL || 'https://trading-engine.onrender.com',
  WS_URL: process.env.REACT_APP_WS_URL || 'wss://trading-engine.onrender.com'
};

// Select config based on environment
const config = isProduction ? PRODUCTION_CONFIG : DEVELOPMENT_CONFIG;

export const API_CONFIG = {
  // Matching Engine API endpoints
  DEPTH_URL: `${config.MATCHING_ENGINE_URL}/api/depth`,
  ORDERS_URL: `${config.MATCHING_ENGINE_URL}/api/orders`,
  
  // WebSocket endpoints
  DEPTH_WS_URL: `${config.WS_URL}/ws/depth`,
  PRIVATE_WS_URL: `${config.WS_URL}/ws/private`,
  
  // Base URLs
  BASE_URL: config.MATCHING_ENGINE_URL,
  WS_BASE_URL: config.WS_URL,
};

// Helper function to get market-specific depth URL
export const getDepthUrl = (marketId) => {
  return `${API_CONFIG.DEPTH_URL}?market_id=${marketId}`;
};

// Helper function to get market-specific WebSocket URL
export const getDepthWsUrl = (marketId) => {
  return `${API_CONFIG.DEPTH_WS_URL}?market_id=${marketId}`;
};

// Debug logging for development
if (isDevelopment) {
  console.log('[API Config] Environment:', process.env.NODE_ENV || 'development');
  console.log('[API Config] Using URLs:', {
    MATCHING_ENGINE: config.MATCHING_ENGINE_URL,
    WEBSOCKET: config.WS_URL
  });
}

export default API_CONFIG; 