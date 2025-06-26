import React, { useState, useEffect, useRef } from 'react';
import './OrderBook.css';

function OrderBook({ selectedMarket }) {
  const [activeTab, setActiveTab] = useState('orderbook');
  const [orderBook, setOrderBook] = useState({ asks: [], bids: [] });
  const [trades, setTrades] = useState([]);
  const [spread, setSpread] = useState({ value: 0, percentage: 0 });
  const [maxLogTotal, setMaxLogTotal] = useState(1);
  const asksContainerRef = useRef(null);

  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        const response = await fetch(`https://zo-devnet.n1.xyz/orderbook?market_id=${selectedMarket.marketId}`);
        const data = await response.json();
        
        const lowestAsks = data.asks.sort((a, b) => a[0] - b[0]);
        const highestBids = data.bids.sort((a, b) => b[0] - a[0]);

        const asksWithLog = lowestAsks.map(a => ({ price: a[0], size: a[1], logTotal: Math.log2((a[0] * a[1]) + 1) }));
        const bidsWithLog = highestBids.map(b => ({ price: b[0], size: b[1], logTotal: Math.log2((b[0] * b[1]) + 1) }));

        const maxLog = Math.max(...asksWithLog.map(a => a.logTotal), ...bidsWithLog.map(b => b.logTotal));
        setMaxLogTotal(maxLog > 0 ? maxLog : 1);

        setOrderBook({ asks: [...asksWithLog].reverse(), bids: bidsWithLog });

        if (lowestAsks.length > 0 && highestBids.length > 0) {
          const lowestAskPrice = lowestAsks[0][0];
          const highestBidPrice = highestBids[0][0];
          const newSpread = lowestAskPrice - highestBidPrice;
          const newSpreadPercentage = highestBidPrice > 0 ? (newSpread / highestBidPrice) * 100 : 0;
          setSpread({ value: newSpread, percentage: newSpreadPercentage });
        }
      } catch (error) {
        console.error('Error fetching order book:', error);
      }
    };

    const fetchTrades = async () => {
      try {
        const response = await fetch('https://zo-devnet.n1.xyz/trades');
        const data = await response.json();
        const filteredTrades = data.trades.filter(trade => trade.marketId === selectedMarket.marketId);
        setTrades(filteredTrades);
      } catch (error) {
        console.error('Error fetching trades:', error);
      }
    };

    fetchOrderBook();
    fetchTrades();
    const orderBookInterval = setInterval(fetchOrderBook, 1000);
    const tradesInterval = setInterval(fetchTrades, 1000);

    return () => {
      clearInterval(orderBookInterval);
      clearInterval(tradesInterval);
    };
  }, [selectedMarket]);

  useEffect(() => {
    if (asksContainerRef.current) {
      asksContainerRef.current.scrollTop = asksContainerRef.current.scrollHeight;
    }
  }, [orderBook.asks]);

  return (
    <div className="orderbook-panel">
        <div className="mini-header">
          <button className={activeTab === 'orderbook' ? 'active' : ''} onClick={() => setActiveTab('orderbook')}>OrderBook</button>
          <button className={activeTab === 'trades' ? 'active' : ''} onClick={() => setActiveTab('trades')}>Trades</button>
        </div>
        {activeTab === 'orderbook' && (
          <>
            <div className="sells">
              <div className="table-header">
                <span className="price-header">Price</span>
                <span className="amount-header">Amount</span>
                <span className="value-header">Value</span>
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
                <span className="price-header">Price</span>
                <span className="amount-header">Amount</span>
                <span className="value-header">Value</span>
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
        {activeTab === 'trades' && (
          <div className="trades-list">
            <div className="table-header">
              <span className="trade-price">Price</span>
              <span className="trade-arrow"></span>
              <span className="trade-size">Size ({selectedMarket.name.split('-')[0]})</span>
              <span className="trade-time">Time</span>
            </div>
            <ul>
              {trades.map((trade, index) => (
                <li key={index} className={trade.takerSide === 'bid' ? 'trade-buy' : 'trade-sell'}>
                  <span className="trade-price">
                    {(trade.price / 10).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                  <span className="trade-arrow">{trade.takerSide === 'bid' ? '↑' : '↓'}</span>
                  <span className="trade-size">{(trade.baseSize / 100000).toLocaleString('en-US', {minimumFractionDigits: 5, maximumFractionDigits: 5})}</span>
                  <span className="trade-time">{new Date(trade.time).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}

export default OrderBook; 