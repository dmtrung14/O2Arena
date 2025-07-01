import React, { useState, useEffect, useRef } from 'react';
import './OrderBook.css';

function OrderBook({ selectedMarket }) {
  const [activeTab, setActiveTab] = useState('orderbook');
  const [orderBook, setOrderBook] = useState({ asks: [], bids: [] });
  const [trades, setTrades] = useState([]);
  const [spread, setSpread] = useState({ value: 0, percentage: 0 });
  const [maxLogTotal, setMaxLogTotal] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const asksContainerRef = useRef(null);

  useEffect(() => {
    let ws;
    let fallbackInterval;
    let reconnectTimeout;
    let isCleaningUp = false;

    const handleSnapshot = (data) => {
      if (isCleaningUp) return; // Ignore data if we're cleaning up
      
      if (!data || !data.asks || !data.bids) {
        console.warn('[OrderBook] Invalid snapshot data received');
        return;
      }

      const lowestAsks = [...data.asks].sort((a, b) => a[0] - b[0]);
      const highestBids = [...data.bids].sort((a, b) => b[0] - a[0]);

      const asksWithLog = lowestAsks.map((a) => ({ 
        price: a[0], 
        size: a[1], 
        logTotal: Math.log2((a[0] * a[1]) + 1) 
      }));
      const bidsWithLog = highestBids.map((b) => ({ 
        price: b[0], 
        size: b[1], 
        logTotal: Math.log2((b[0] * b[1]) + 1) 
      }));

      const maxLog = Math.max(
        ...asksWithLog.map((a) => a.logTotal), 
        ...bidsWithLog.map((b) => b.logTotal)
      );
      setMaxLogTotal(maxLog > 0 ? maxLog : 1);

      setOrderBook({ asks: [...asksWithLog].reverse(), bids: bidsWithLog });

      if (lowestAsks.length > 0 && highestBids.length > 0) {
        const lowestAskPrice = lowestAsks[0][0];
        const highestBidPrice = highestBids[0][0];
        const newSpread = lowestAskPrice - highestBidPrice;
        const newSpreadPercentage = highestBidPrice > 0 ? (newSpread / highestBidPrice) * 100 : 0;
        setSpread({ value: newSpread, percentage: newSpreadPercentage });
      }
    };

    const fetchFallback = async () => {
      if (!selectedMarket || isCleaningUp) return;
      
      try {
        const marketId = selectedMarket.marketId || 4; // Default to BTC
        const response = await fetch(`http://localhost:4000/api/depth?market_id=${marketId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[OrderBook] Fallback data received for market ${selectedMarket.name}:`, data);
        handleSnapshot(data);
        setConnectionStatus('Connected (Fallback)');
      } catch (err) {
        console.error('Fallback fetch error', err);
        if (!isCleaningUp) {
          setConnectionStatus('Connection Error');
        }
      }
    };

    const connectWs = () => {
      if (!selectedMarket || isCleaningUp) {
        console.warn('[OrderBook] No selected market or cleaning up, skipping WebSocket connection');
        return;
      }

      let base;
      if (process.env.REACT_APP_ENGINE_URL) {
        base = process.env.REACT_APP_ENGINE_URL.replace(/^http/, 'ws');
      } else if (window.location.port === '3000') {
        base = 'ws://localhost:4000';
      } else {
        base = window.location.origin.replace(/^http/, 'ws');
      }

      const marketId = selectedMarket.marketId || 4;
      const url = `${base}/ws/depth?market_id=${marketId}`;
      console.log(`[OrderBook] Connecting to WebSocket for ${selectedMarket.name} (ID: ${marketId}):`, url);
      
      try {
        ws = new WebSocket(url);
        
        ws.onopen = () => {
          if (isCleaningUp) return;
          console.log(`[OrderBook] WebSocket connected for ${selectedMarket.name}`);
          setConnectionStatus('Connected');
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
        };
        
        ws.onmessage = (evt) => {
          if (isCleaningUp) return;
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === 'depth') {
              console.log(`[OrderBook] Real-time data received for ${selectedMarket.name}`);
              handleSnapshot(msg.data);
              setConnectionStatus('Live Data');
            }
          } catch (err) {
            console.error('WS parse error', err);
          }
        };
        
        ws.onclose = (evt) => {
          if (isCleaningUp) return;
          console.log(`[OrderBook] WebSocket closed for ${selectedMarket.name}, code:`, evt.code, 'reason:', evt.reason);
          setConnectionStatus('Reconnecting...');
          if (!fallbackInterval) {
            fallbackInterval = setInterval(fetchFallback, 2000);
          }
          // Only reconnect if we're not cleaning up
          if (!isCleaningUp) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };
        
        ws.onerror = (err) => {
          if (isCleaningUp) return;
          console.error(`[OrderBook] WebSocket error for ${selectedMarket.name}:`, err);
          setConnectionStatus('Connection Error');
          if (!fallbackInterval) {
            fallbackInterval = setInterval(fetchFallback, 2000);
          }
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        if (!isCleaningUp) {
          setConnectionStatus('Failed to Connect');
          if (!fallbackInterval) {
            fallbackInterval = setInterval(fetchFallback, 2000);
          }
        }
      }
    };

    // Clear existing data when market changes
    setOrderBook({ asks: [], bids: [] });
    setConnectionStatus('Connecting...');

    connectWs();

    return () => {
      isCleaningUp = true;
      console.log(`[OrderBook] Cleaning up WebSocket for ${selectedMarket?.name}`);
      
      if (ws) {
        ws.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [selectedMarket]);

  useEffect(() => {
    if (asksContainerRef.current) {
      asksContainerRef.current.scrollTop = asksContainerRef.current.scrollHeight;
    }
  }, [orderBook.asks]);

  const hasData = orderBook.asks.length > 0 || orderBook.bids.length > 0;

  return (
    <div className="orderbook-panel">
        <div className="mini-header">
          <button className={activeTab === 'orderbook' ? 'active' : ''} onClick={() => setActiveTab('orderbook')}>
            OrderBook
          </button>
          <button className={activeTab === 'trades' ? 'active' : ''} onClick={() => setActiveTab('trades')}>
            Trades
          </button>
          <div className="connection-status">
            <span className={`status-indicator ${connectionStatus.includes('Connected') || connectionStatus.includes('Live') ? 'connected' : 'disconnected'}`}>
              ●
            </span>
            <span className="status-text">{connectionStatus}</span>
          </div>
        </div>
        
        {activeTab === 'orderbook' && (
          <>
            {!hasData ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading {selectedMarket?.name || 'market'} data...</p>
                <small>{connectionStatus}</small>
              </div>
            ) : (
              <>
                <div className="sells">
                  <div className="table-header">
                    <span className="price-header">Price (USD)</span>
                    <span className="amount-header">Amount ({selectedMarket?.name?.split('-')[0] || 'BTC'})</span>
                    <span className="value-header">Value (USD)</span>
                  </div>
                  <ul ref={asksContainerRef}>
                    {orderBook.asks.map((ask, index) => (
                      <li key={index}>
                        <div className="bg-bar" style={{ width: `${(ask.logTotal / maxLogTotal) * 100}%` }}></div>
                        <div className="data-row">
                          <span className="price">{ask.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          <span className="amount">{ask.size.toLocaleString('en-US', {minimumFractionDigits: 5, maximumFractionDigits: 5})}</span>
                          <span className="value">{(ask.price * ask.size).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="spread">
                  <span className="spread-label">Spread</span>
                  <span className="spread-value">{spread.value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  <span className="spread-percentage">{spread.percentage.toFixed(2)}%</span>
                </div>

                <div className="buys">
                  <div className="table-header">
                    <span className="price-header">Price (USD)</span>
                    <span className="amount-header">Amount ({selectedMarket?.name?.split('-')[0] || 'BTC'})</span>
                    <span className="value-header">Value (USD)</span>
                  </div>
                  <ul>
                    {orderBook.bids.map((bid, index) => (
                      <li key={index}>
                        <div className="bg-bar" style={{ width: `${(bid.logTotal / maxLogTotal) * 100}%` }}></div>
                        <div className="data-row">
                          <span className="price">{bid.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          <span className="amount">{bid.size.toLocaleString('en-US', {minimumFractionDigits: 5, maximumFractionDigits: 5})}</span>
                          <span className="value">{(bid.price * bid.size).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </>
        )}
        
        {activeTab === 'trades' && (
          <div className="trades-list">
            <div className="table-header">
              <span className="trade-price">Price</span>
              <span className="trade-arrow"></span>
              <span className="trade-size">Size ({selectedMarket?.name?.split('-')[0] || 'BTC'})</span>
              <span className="trade-time">Time</span>
            </div>
            <ul>
              {trades.length === 0 ? (
                <li className="no-trades">
                  <span>No recent trades</span>
                </li>
              ) : (
                trades.map((trade, index) => (
                  <li key={index} className={trade.takerSide === 'bid' ? 'trade-buy' : 'trade-sell'}>
                    <span className="trade-price">
                      {(trade.price / 10).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                    <span className="trade-arrow">{trade.takerSide === 'bid' ? '↑' : '↓'}</span>
                    <span className="trade-size">{(trade.baseSize / 100000).toLocaleString('en-US', {minimumFractionDigits: 5, maximumFractionDigits: 5})}</span>
                    <span className="trade-time">{new Date(trade.time).toLocaleTimeString()}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
    </div>
  );
}

export default OrderBook; 