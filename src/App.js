import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import MarketSelector from './components/MarketSelector';
import Chart from './components/Chart';
import OrderBook from './components/OrderBook';
import TradeForm from './components/TradeForm';
import Portfolio from './pages/Portfolio';
import Markets from './pages/Markets';
import LandingPage from './pages/LandingPage';

const markets = [
  { name: 'BTC-USDC', logo: '/bitcoin.svg', marketId: 4 },
  { name: 'ETH-USDC', logo: '/ethereum.svg', marketId: 3 },
  { name: 'SOL-USDC', logo: '/solana.svg', marketId: 5 },
];

function App() {
  const [selectedMarket, setSelectedMarket] = useState(markets[0]);

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/trade" element={
            <>
              <Header />
              <main className="main-content">
                <div className="trade-layout-grid">
                  <div className="chart-container">
                    <MarketSelector
                      markets={markets}
                      selectedMarket={selectedMarket}
                      onMarketChange={setSelectedMarket}
                    />
                    <Chart />
                  </div>
                  <OrderBook selectedMarket={selectedMarket} />
                  <TradeForm selectedMarket={selectedMarket} />
                </div>
              </main>
            </>
          } />
          <Route path="/portfolio" element={
            <>
              <Header />
              <Portfolio />
            </>
          } />
          <Route path="/markets" element={
            <>
              <Header />
              <Markets />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
