import React, { useState, useEffect } from 'react';
import './LeverageModal.css';

function LeverageModal({ isOpen, onClose, leverage, setLeverage, selectedMarket }) {
  const [currentLeverage, setCurrentLeverage] = useState(leverage);

  useEffect(() => {
    setCurrentLeverage(leverage);
  }, [leverage]);

  if (!isOpen) return null;

  const handleLeverageChange = () => {
    setLeverage(currentLeverage);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Adjust Leverage</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <p>Control the leverage used for this position. The maximum leverage for {selectedMarket.name.split('-')[0]}PERP is 10.</p>
          <p className="warning-text">WARNING: Increasing leverage means increasing the risk of liquidation.</p>
          <div className="leverage-slider-container">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={currentLeverage}
              onChange={(e) => setCurrentLeverage(Number(e.target.value))}
              className="leverage-modal-slider"
              style={{'--slider-progress': `${((currentLeverage - 1) / 9) * 100}%`}}
            />
            <div className="leverage-display-box">
              <span>{currentLeverage}x</span>
            </div>
          </div>
          <button onClick={handleLeverageChange} className="change-leverage-btn">
            Change Leverage
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeverageModal; 