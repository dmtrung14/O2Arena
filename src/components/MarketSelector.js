import React, { useState, useEffect, useRef } from 'react';
import './MarketSelector.css';

const MarketSelector = ({ markets, selectedMarket, onMarketChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [marketStats, setMarketStats] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const fetchMarketStats = async () => {
      try {
        const response = await fetch('https://zo-devnet.n1.xyz/stats');
        const data = await response.json();
        const marketData = data.markets.find(m => m.marketId === selectedMarket.marketId);

        if (marketData) {
          const change = marketData.indexPrice[0] - marketData.perpStats.mark_price;
          const changePercent = (change / marketData.perpStats.mark_price) * 100;

          setMarketStats({
            price: marketData.indexPrice[0],
            volume24h: marketData.volume24h * marketData.indexPrice[0],
            change24h: changePercent,
            openInterest: marketData.perpStats.open_interest * marketData.indexPrice[0],
            fundingRate: marketData.perpStats.funding_rate,
          });
        }
      } catch (error) {
        console.error("Failed to fetch market stats:", error);
      }
    };

    fetchMarketStats();
    const interval = setInterval(fetchMarketStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [selectedMarket]);

  const fundingRate = marketStats ? marketStats.fundingRate : 0;
  const bidPercentage = 50 * (1 - fundingRate);
  const askPercentage = 50 * (1 + fundingRate);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSelectMarket = (market) => {
    onMarketChange(market);
    setMarketStats(null);
    setIsOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);


  return (
    <div className="market-selector-container" ref={wrapperRef}>
      <div className="market-selector-header">
        <div className="market-identity" onClick={handleToggle}>
          <div className="hamburger-icon">
            <div />
            <div />
            <div />
          </div>
          <img src={selectedMarket.logo} alt={`${selectedMarket.name} logo`} className="market-logo" />
          <span className="market-name">{selectedMarket.name}</span>
        </div>
        {marketStats ? (
          <div className="market-metrics">
            <div className="metric-item">
              <div className={`metric-value ${marketStats.change24h >= 0 ? 'green' : 'red'}`}>
                ${marketStats.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
              <div className="metric-label">{selectedMarket.name.split('-')[0]} Price</div>
            </div>
            <div className="metric-item">
              <div className={`metric-value ${marketStats.change24h >= 0 ? 'green' : 'red'}`}>
                {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
              </div>
              <div className="metric-label">24h Change</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">
                ${marketStats.openInterest.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
              <div className="metric-label">Open Interest</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">
                ${marketStats.volume24h.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
              <div className="metric-label">24h Volume</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">
                  <span className="green">{bidPercentage.toFixed(1)}%</span>
                  <div className="bid-ask-ratio-bar">
                      <div className="bid-ratio-fill" style={{width: `${bidPercentage}%`}}></div>
                  </div>
                  <span className="red">{askPercentage.toFixed(1)}%</span>
              </div>
              <div className="metric-label">Bid - Ask Ratio</div>
            </div>
          </div>
        ) : (
          <div className="market-metrics">Loading...</div>
        )}
      </div>
      {isOpen && (
        <div className="market-dropdown">
          <div className="search-bar">
            <input type="text" placeholder="Search token..." />
          </div>
           <div className="market-tabs">
            <span>All</span>
            <span>Favs</span>
            <span>Recently Listed</span>
          </div>
          <div className="market-list">
            {markets.map((market) => (
              <div
                key={market.name}
                className="market-item"
                onClick={() => handleSelectMarket(market)}
              >
                <img src={market.logo} alt={`${market.name} logo`} className="market-logo" />
                <span className="market-name-dropdown">{market.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketSelector; 