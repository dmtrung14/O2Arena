import React, { useState } from 'react';
import './Portfolio.css';

function Portfolio() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div className={`search-account-container ${isSearchFocused ? 'focused' : ''}`}>
          <i className="search-icon"></i>
          <input 
            type="text" 
            placeholder="Search Account" 
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          <div className="info-icon-wrapper">
            <i className="info-icon">i</i>
            <div className="info-tooltip">
                <p className="tooltip-title">Search Prefixes:</p>
                <ul>
                    <li><span className="prefix-key">w/</span> Solana wallet address (w/Hh34s...)</li>
                    <li><span className="prefix-key">x/</span> X handle (x/cited)</li>
                    <li><span className="prefix-key">u/</span> Username (u/Degen-Trader)</li>
                </ul>
                <p className="tooltip-footer">Leave blank for general search</p>
            </div>
          </div>
        </div>
      </div>
      <div className="portfolio-main-content">
        <div className="top-section">
          <div className="top-box"></div>
          <div className="top-box"></div>
        </div>
        <div className="middle-section">
          <div className="panel chart-panel">
            <div className="connect-wallet-placeholder">
              <p>Connect Wallet</p>
            </div>
          </div>
          <div className="panel pnl-panel">
            <div className="panel-header">
              <div className="tabs">
                <button className="active">PnL</button>
                <button>Account Value</button>
              </div>
              <div className="dropdown">
                <span>Last 1 day</span>
                <i className="arrow-down-icon"></i>
              </div>
            </div>
            <div className="connect-wallet-placeholder">
              <p>Connect Wallet</p>
            </div>
          </div>
        </div>
        <div className="bottom-section panel">
          <div className="panel-header">
            <div className="tabs">
              <button className="active">Positions</button>
              <button>Open Orders</button>
              <button>Order History</button>
              <button>Trade History</button>
            </div>
            <div className="dropdown">
              <span>Filter</span>
              <i className="arrow-down-icon"></i>
            </div>
          </div>
          <div className="connect-wallet-placeholder">
            <p>Connect Wallet</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Portfolio;
