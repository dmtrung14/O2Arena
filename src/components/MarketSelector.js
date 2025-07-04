import React, { useState, useRef } from 'react';
import './MarketSelector.css';

const MarketSelector = ({ markets, allMarkets, selectedMarket, onMarketChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const wrapperRef = useRef(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setSearchQuery(''); // Clear search when opening/closing
  };

  const handleSelectMarket = (market) => {
    onMarketChange(market);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter markets based on search query and active tab
  const getFilteredMarkets = () => {
    let marketsToShow = allMarkets || markets;
    
    // Filter by search query
    if (searchQuery.trim()) {
      marketsToShow = marketsToShow.filter(market => 
        market.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (market.name.includes('-') && market.name.split('-')[0].toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Filter by tab
    if (activeTab !== 'All' && marketsToShow.some(m => m.type)) {
      if (activeTab === 'Crypto') {
        marketsToShow = marketsToShow.filter(market => market.type === 'crypto');
      } else if (activeTab === 'Stocks') {
        marketsToShow = marketsToShow.filter(market => market.type === 'stock');
      }
    }
    
    return marketsToShow;
  };

  // Get quick selection markets (featured markets for non-search view)
  const getQuickSelectionMarkets = () => {
    if (searchQuery.trim()) {
      return []; // Don't show quick selection when searching
    }
    return markets; // Original featured markets for quick selection
  };

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
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
      </div>
      {isOpen && (
        <div className="market-dropdown">
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Search symbol..." 
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>
          <div className="market-tabs">
            <span 
              className={activeTab === 'All' ? 'active' : ''}
              onClick={() => setActiveTab('All')}
            >
              All
            </span>
            <span 
              className={activeTab === 'Crypto' ? 'active' : ''}
              onClick={() => setActiveTab('Crypto')}
            >
              Crypto
            </span>
            <span 
              className={activeTab === 'Stocks' ? 'active' : ''}
              onClick={() => setActiveTab('Stocks')}
            >
              Stocks
            </span>
          </div>
          <div className="market-list">
            {/* Quick Selection Section */}
            {!searchQuery.trim() && (
              <>
                <div className="market-section-header">Quick Selection</div>
                {getQuickSelectionMarkets().map((market) => (
                  <div
                    key={`quick-${market.name}`}
                    className="market-item"
                    onClick={() => handleSelectMarket(market)}
                  >
                    <div className="market-item-left">
                      <img src={market.logo} alt={market.name} className="market-logo" />
                      <span className="market-item-name">{market.name}</span>
                    </div>
                    {market.fullName && <span className="market-full-name">{market.fullName}</span>}
                  </div>
                ))}
              </>
            )}
            {/* Filtered Markets Section */}
            <div className="market-section-header">All Markets</div>
            {getFilteredMarkets().map((market) => (
              <div
                key={market.name}
                className="market-item"
                onClick={() => handleSelectMarket(market)}
              >
                <div className="market-item-left">
                  <img src={market.logo} alt={market.name} className="market-logo" />
                  <span className="market-item-name">{market.name}</span>
                </div>
                {market.fullName && <span className="market-full-name">{market.fullName}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketSelector; 