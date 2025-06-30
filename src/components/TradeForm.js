import React, { useState } from 'react';
import './TradeForm.css';
import LeverageModal from './LeverageModal';
import AuthModal from './AuthModal';
import { useAuth } from '../App';

const advancedOrderTypes = ['None', 'Immediate or Cancel', 'Fill or Kill'];

function TradeForm({ selectedMarket }) {
  const { user } = useAuth();
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

  const handleTrade = () => {
    console.log('Trade executed');
  };

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
            <span>$0.00</span>
          </div>
          <div className="form-row">
            <label>Max Position Size</label>
            <span>0.00000</span>
          </div>
          
          {orderType === 'limit' && (
            <div className="form-row input-row">
              <label>Price</label>
              <div className="amount-input-wrapper">
                <input type="text" placeholder="106282.4" />
                <span className="input-adornment currency">MID</span>
              </div>
            </div>
          )}

          <div className="form-row input-row">
            <label>Amount</label>
            <div className="amount-input-wrapper">
              <input type="text" placeholder="0" />
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
            <span>$0.00</span>
          </div>
          <div className="form-row info-row">
            <label>Initial Margin</label>
            <span>$0.00</span>
          </div>
          <div className="form-row info-row">
            <label>Est. Liquidation Price</label>
            <span>N/A</span>
          </div>

          {user ? (
            <button className="connect-wallet-form-btn" onClick={handleTrade}>
              {direction === 'buy' ? 'Buy' : 'Sell'}
            </button>
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