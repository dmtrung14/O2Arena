import React, { useState, useEffect } from 'react';
import './TradeForm.css';
import LeverageModal from './LeverageModal';
import AuthModal from './AuthModal';
import { useAuth } from '../App';
import { useSubaccount } from '../context/SubaccountContext';
import { db } from '../firebase';
import { collection, doc, getDocs, updateDoc, arrayUnion, query } from 'firebase/firestore';

const advancedOrderTypes = ['None', 'Immediate or Cancel', 'Fill or Kill'];

function TradeForm({ selectedMarket }) {
  const { user } = useAuth();
  const { subaccounts, selectedSubaccount, updateSubaccount } = useSubaccount();
  
  const [orderType, setOrderType] = useState('limit');
  const [direction, setDirection] = useState('buy');
  const [leverage, setLeverage] = useState(10);
  const [isLeverageModalOpen, setIsLeverageModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [advancedOrderType, setAdvancedOrderType] = useState('None');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState({
    'reduce-only': true,
    'post-only': false,
  });

  // Trading form inputs
  const [priceInput, setPriceInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  
  // Trading state
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);

  // Note: Subaccount data is now managed by SubaccountContext

  // Fetch current market price
  useEffect(() => {
    if (!selectedMarket) return;
    
    const fetchPrice = async () => {
      try {
        // Use our local orderbook instead of external API
        const response = await fetch(`http://localhost:4000/api/depth?market_id=${selectedMarket.marketId}`);
        const data = await response.json();
        if (data.asks && data.asks.length > 0 && data.bids && data.bids.length > 0) {
          const midPrice = (data.asks[0][0] + data.bids[0][0]) / 2;
          setCurrentPrice(midPrice);
          
          // Set default price for limit orders
          if (orderType === 'limit' && !priceInput) {
            setPriceInput(midPrice.toFixed(2));
          }
        }
      } catch (error) {
        console.error('Error fetching price from local orderbook:', error);
        console.log('Falling back to mock price based on market');
        
        // Fallback to mock prices if local server is not available
        const mockPrices = {
          4: 100000,    // BTC-USDC
          3: 3500,      // ETH-USDC
          5: 200,       // SOL-USDC
          6: 0.35,      // DOGE-USDC
          7: 1.2,       // ADA-USDC
          8: 350,       // TSLA
          9: 140,       // NVDA
          10: 580,      // META
          11: 45,       // PLTR
          12: 120,      // SNOW
          13: 85,       // UBER
          14: 25,       // HOOD
          15: 160       // ABNB
        };
        
        const fallbackPrice = mockPrices[selectedMarket.marketId] || 100;
        setCurrentPrice(fallbackPrice);
        
        if (orderType === 'limit' && !priceInput) {
          setPriceInput(fallbackPrice.toFixed(2));
        }
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 2000);
    return () => clearInterval(interval);
  }, [selectedMarket, orderType, priceInput]);

  // Subaccount fetching is now handled by SubaccountContext

  // Calculate available balance for trading
  const getAvailableBalance = () => {
    if (!selectedSubaccount || !user) return 0;
    
    if (direction === 'buy') {
      // For buying, show available cash balance
      return selectedSubaccount.balance || 0;
    } else {
      // For selling, show available position in the selected asset
      const assetSymbol = selectedMarket.name.split('-')[0]; // BTC, ETH, SOL
      const position = selectedSubaccount.positions?.find(p => p.symbol === assetSymbol);
      return position ? position.size : 0;
    }
  };

  // Calculate order value
  const getOrderValue = () => {
    const price = orderType === 'market' ? currentPrice : parseFloat(priceInput) || 0;
    const amount = parseFloat(amountInput) || 0;
    return price * amount;
  };

  // Calculate max position size based on available balance and leverage
  const getMaxPositionSize = () => {
    if (!currentPrice || currentPrice === 0) return 0;
    
    const availableBalance = getAvailableBalance();
    
    if (direction === 'buy') {
      const price = orderType === 'market' ? currentPrice : parseFloat(priceInput) || currentPrice;
      return (availableBalance * leverage) / price;
    } else {
      return availableBalance; // For selling, max is what you own
    }
  };

  // Update amount based on slider percentage
  useEffect(() => {
    if (sliderValue > 0) {
      const maxSize = getMaxPositionSize();
      const calculatedAmount = (maxSize * sliderValue) / 100;
      setAmountInput(calculatedAmount.toFixed(8));
    }
  }, [sliderValue, direction, currentPrice, priceInput, selectedSubaccount]);

  const handleSliderChange = (e) => {
    const { value } = e.target;
    if (value === '') {
      setSliderValue('');
    } else {
      const numValue = Math.max(0, Math.min(100, Number(value)));
      setSliderValue(numValue);
    }
  };

  const handleSliderBlur = () => {
    if (sliderValue === '') {
      setSliderValue(0);
    }
  };

  const handleCheckboxChange = (option) => {
    setCheckboxes(prev => {
      const newState = { ...prev };
      if (option === 'reduce-only') {
        newState['reduce-only'] = !prev['reduce-only'];
        if (newState['reduce-only']) newState['post-only'] = false;
      } else if (option === 'post-only') {
        newState['post-only'] = !prev['post-only'];
        if (newState['post-only']) newState['reduce-only'] = false;
      }
      return newState;
    });
  };

  const handleSignInClick = () => {
    setIsAuthModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleTrade = async () => {
    if (!user || !selectedSubaccount || !selectedMarket || isExecutingTrade) return;
    
    const amount = parseFloat(amountInput);
    const price = orderType === 'market' ? currentPrice : parseFloat(priceInput);
    
    if (!amount || amount <= 0 || !price || price <= 0) {
      alert('Please enter valid amount and price');
      return;
    }

    const orderValue = price * amount;
    const availableBalance = getAvailableBalance();
    
    // Validate sufficient balance
    if (direction === 'buy' && orderValue > availableBalance) {
      alert('Insufficient balance for this trade');
      return;
    }
    
    if (direction === 'sell' && amount > availableBalance) {
      alert('Insufficient position size for this trade');
      return;
    }

    setIsExecutingTrade(true);

    try {
      const subaccountRef = doc(db, 'portfolios', user.uid, 'subaccounts', selectedSubaccount.id);
      const assetSymbol = selectedMarket.name.split('-')[0];
      
      // Create trade record
      const trade = {
        id: doc(collection(db, 'temp')).id,
        symbol: selectedMarket.name,
        asset: assetSymbol,
        side: direction,
        type: orderType,
        amount,
        price,
        value: orderValue,
        timestamp: new Date().toISOString(),
        status: 'filled'
      };

      // Calculate new balance and positions
      let newBalance = selectedSubaccount.balance || 0;
      let newPositions = [...(selectedSubaccount.positions || [])];
      
      if (direction === 'buy') {
        // Deduct cash, add position
        newBalance -= orderValue;
        
        const existingPosition = newPositions.find(p => p.symbol === assetSymbol);
        if (existingPosition) {
          const totalValue = (existingPosition.size * existingPosition.avgPrice) + orderValue;
          const totalSize = existingPosition.size + amount;
          existingPosition.size = totalSize;
          existingPosition.avgPrice = totalValue / totalSize;
        } else {
          newPositions.push({
            symbol: assetSymbol,
            size: amount,
            avgPrice: price,
            side: 'long'
          });
        }
      } else {
        // Add cash, reduce position
        newBalance += orderValue;
        
        const positionIndex = newPositions.findIndex(p => p.symbol === assetSymbol);
        if (positionIndex !== -1) {
          newPositions[positionIndex].size -= amount;
          if (newPositions[positionIndex].size <= 0) {
            newPositions.splice(positionIndex, 1);
          }
        }
      }

      // Calculate new account value
      let newAccountValue = newBalance;
      
      // Get current prices for all positions
      for (const position of newPositions) {
        // Use the position's current market price, not just the selectedMarket price
        let positionPrice = currentPrice; // Default to current market price
        
        // For different assets, we should ideally fetch their individual prices
        // For now, use the current price if it's the same asset as selected market
        const selectedAsset = selectedMarket.name.split('-')[0];
        if (position.symbol === selectedAsset) {
          positionPrice = currentPrice;
        } else {
          // For other assets, use stored average price as approximation
          positionPrice = position.avgPrice || currentPrice;
        }
        
        const positionValue = position.size * positionPrice;
        newAccountValue += positionValue;
        
        console.log(`[Portfolio] Position ${position.symbol}: ${position.size} @ $${positionPrice} = $${positionValue}`);
      }
      
      console.log(`[Portfolio] New account value calculation:`);
      console.log(`  Cash balance: $${newBalance}`);
      console.log(`  Total account value: $${newAccountValue}`);
      console.log(`  Positions:`, newPositions);

      // Update Firestore
      await updateDoc(subaccountRef, {
        balance: newBalance,
        accountValue: newAccountValue,
        positions: newPositions,
        tradeHistory: arrayUnion(trade)
      });

      // Update context state
      const updatedSubaccount = {
        ...selectedSubaccount,
        balance: newBalance,
        accountValue: newAccountValue,
        positions: newPositions,
        tradeHistory: [...(selectedSubaccount.tradeHistory || []), trade]
      };
      
      // Update the subaccount in context (this updates both the list and selected subaccount)
      updateSubaccount(updatedSubaccount);

      // Clear form
      setAmountInput('');
      setSliderValue(0);
      
      alert(`${direction.toUpperCase()} order executed successfully!`);
      
    } catch (error) {
      console.error('Error executing trade:', error);
      alert('Error executing trade. Please try again.');
    } finally {
      setIsExecutingTrade(false);
    }
  };

  const availableBalance = getAvailableBalance();
  const maxPositionSize = getMaxPositionSize();
  const orderValue = getOrderValue();

  return (
    <>
      <div className="trade-form-panel">
        <div className="order-type-tabs">
          <button className={orderType === 'market' ? 'active' : ''} onClick={() => setOrderType('market')}>Market</button>
          <button className={orderType === 'limit' ? 'active' : ''} onClick={() => setOrderType('limit')}>Limit</button>
        </div>

        <div className="direction-leverage-tabs">
          <div className="direction-tabs">
            <button 
              className={`buy-btn ${direction === 'buy' ? 'active' : ''}`} 
              onClick={() => setDirection('buy')}
            >
              Buy | Long
            </button>
            <button 
              className={`sell-btn ${direction === 'sell' ? 'active' : ''}`} 
              onClick={() => setDirection('sell')}
            >
              Sell | Short
            </button>
          </div>
          <button className="leverage-btn" onClick={() => setIsLeverageModalOpen(true)}>{leverage}x</button>
        </div>

        <div className="form-body">
          <div className="form-row">
            <label>Available to Trade</label>
            <span>
              {direction === 'buy' 
                ? `$${availableBalance.toLocaleString()}`
                : `${availableBalance.toFixed(8)} ${selectedMarket.name.split('-')[0]}`
              }
            </span>
          </div>
          <div className="form-row">
            <label>Max Position Size</label>
            <span>{maxPositionSize.toFixed(8)}</span>
          </div>
          
          {orderType === 'limit' && (
            <div className="form-row input-row">
              <label>Price</label>
              <div className="amount-input-wrapper">
                <input 
                  type="text" 
                  placeholder="106282.4" 
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                />
                <span className="input-adornment currency">USD</span>
              </div>
            </div>
          )}

          <div className="form-row input-row">
            <label>Amount</label>
            <div className="amount-input-wrapper">
              <input 
                type="text" 
                placeholder="0" 
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
              <span className="input-adornment currency">{selectedMarket.name.split('-')[0]}</span>
            </div>
          </div>

          <div className="form-row slider-row">
            <div className="amount-input-wrapper slider-input">
                <input 
                    type="number" 
                    value={sliderValue} 
                    onChange={handleSliderChange}
                    onBlur={handleSliderBlur}
                    className="slider-percentage-input"
                />
                <span className="input-adornment currency">%</span>
            </div>
            <div className="slider-container">
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sliderValue === '' ? 0 : sliderValue} 
                    onChange={handleSliderChange} 
                    className="leverage-slider"
                    style={{'--slider-progress': `${sliderValue === '' ? 0 : sliderValue}%`}}
                />
                <div className="slider-ticks">
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
            </div>
          </div>

          <div className="form-row">
            <label>Advanced Order Type</label>
          </div>
          <div className="custom-dropdown-container">
              <div className="custom-dropdown-header" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                  <span>{advancedOrderType}</span>
                  <i className={`arrow-down-icon ${isDropdownOpen ? 'open' : ''}`}></i>
              </div>
              {isDropdownOpen && (
                  <ul className="custom-dropdown-list">
                      {advancedOrderTypes.map(type => (
                          <li 
                              key={type} 
                              onClick={() => {
                                  setAdvancedOrderType(type);
                                  setIsDropdownOpen(false);
                              }}
                              className={advancedOrderType === type ? 'active' : ''}
                          >
                              <span className="checkmark-icon">✓</span> {type}
                          </li>
                      ))}
                  </ul>
              )}
          </div>

          <div className="form-row checkbox-row">
            <label className="custom-checkbox">
              <input 
                type="checkbox" 
                checked={checkboxes['reduce-only']}
                onChange={() => handleCheckboxChange('reduce-only')}
              />
              <span className="checkmark"></span>
              Reduce-Only
            </label>
            {orderType === 'limit' && (
              <label className="custom-checkbox">
                <input 
                  type="checkbox" 
                  checked={checkboxes['post-only']}
                  onChange={() => handleCheckboxChange('post-only')}
                />
                <span className="checkmark"></span>
                Post-Only
              </label>
            )}
          </div>

          <div className="form-row info-row">
            <label>Order Value</label>
            <span>${orderValue.toLocaleString()}</span>
          </div>
          <div className="form-row info-row">
            <label>Initial Margin</label>
            <span>${(orderValue / leverage).toLocaleString()}</span>
          </div>
          <div className="form-row info-row">
            <label>Est. Liquidation Price</label>
            <span>N/A</span>
          </div>

          {user ? (
            selectedSubaccount ? (
              <button 
                className="connect-wallet-form-btn" 
                onClick={handleTrade}
                disabled={isExecutingTrade || !amountInput || parseFloat(amountInput) <= 0}
              >
                {isExecutingTrade ? 'Executing...' : `${direction === 'buy' ? 'Buy' : 'Sell'} ${selectedMarket.name.split('-')[0]}`}
              </button>
            ) : (
              <button className="connect-wallet-form-btn" disabled>
                No Subaccount Selected
              </button>
            )
          ) : (
            <button className="connect-wallet-form-btn" onClick={handleSignInClick}>Sign In</button>
          )}
        </div>
        <LeverageModal 
          isOpen={isLeverageModalOpen}
          onClose={() => setIsLeverageModalOpen(false)}
          leverage={leverage}
          setLeverage={setLeverage}
          selectedMarket={selectedMarket}
        />
      </div>
      {isAuthModalOpen && <AuthModal onClose={handleCloseModal} />}
    </>
  );
}

export default TradeForm; 