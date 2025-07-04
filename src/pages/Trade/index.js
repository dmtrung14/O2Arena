import React, { useState, useEffect } from 'react';
import { FaGithub } from 'react-icons/fa';
import MarketSelector from '../../components/MarketSelector';
import Chart from '../../components/Chart';
import OrderBook from '../../components/OrderBook';
import TradeForm from '../../components/TradeForm';
import EnhancedMarketHeader from '../../components/EnhancedMarketHeader';

const markets = [
  { name: 'BTC-USDC', fullName: 'Bitcoin', logo: '/bitcoin.svg', marketId: 4, symbol: 'BINANCE:BTCUSDT' },
  { name: 'ETH-USDC', fullName: 'Ethereum', logo: '/ethereum.svg', marketId: 3, symbol: 'BINANCE:ETHUSDT' },
  { name: 'SOL-USDC', fullName: 'Solana', logo: '/solana.svg', marketId: 5, symbol: 'BINANCE:SOLUSDT' },
  { name: 'DOGE-USDC', fullName: 'Dogecoin', logo: '/dogecoin.svg', marketId: 6, symbol: 'BINANCE:DOGEUSDT' },
  { name: 'ADA-USDC', fullName: 'Cardano', logo: '/cardano.svg', marketId: 7, symbol: 'BINANCE:ADAUSDT' },
  { name: 'TSLA', fullName: 'Tesla', logo: '/tesla.svg', marketId: 8, symbol: 'NASDAQ:TSLA' },
  { name: 'NVDA', fullName: 'Nvidia', logo: '/nvidia.svg', marketId: 9, symbol: 'NASDAQ:NVDA' },
  { name: 'META', fullName: 'Meta', logo: '/meta.svg', marketId: 10, symbol: 'NASDAQ:META' },
];

const allAvailableMarkets = [
  // Crypto
  { name: 'BTC-USDC', fullName: 'Bitcoin', logo: '/bitcoin.svg', marketId: 4, symbol: 'BINANCE:BTCUSDT', type: 'crypto' },
  { name: 'ETH-USDC', fullName: 'Ethereum', logo: '/ethereum.svg', marketId: 3, symbol: 'BINANCE:ETHUSDT', type: 'crypto' },
  { name: 'SOL-USDC', fullName: 'Solana', logo: '/solana.svg', marketId: 5, symbol: 'BINANCE:SOLUSDT', type: 'crypto' },
  { name: 'DOGE-USDC', fullName: 'Dogecoin', logo: '/dogecoin.svg', marketId: 6, symbol: 'BINANCE:DOGEUSDT', type: 'crypto' },
  { name: 'ADA-USDC', fullName: 'Cardano', logo: '/cardano.svg', marketId: 7, symbol: 'BINANCE:ADAUSDT', type: 'crypto' },
  
  // Stocks
  { name: 'TSLA', fullName: 'Tesla', logo: '/tesla.svg', marketId: 8, symbol: 'NASDAQ:TSLA', type: 'stock' },
  { name: 'NVDA', fullName: 'Nvidia', logo: '/nvidia.svg', marketId: 9, symbol: 'NASDAQ:NVDA', type: 'stock' },
  { name: 'META', fullName: 'Meta', logo: '/meta.svg', marketId: 10, symbol: 'NASDAQ:META', type: 'stock' },
  { name: 'PLTR', fullName: 'Palantir', logo: '/palantir.svg', marketId: 11, symbol: 'NYSE:PLTR', type: 'stock' },
  { name: 'SNOW', fullName: 'Snowflake', logo: '/snowflake.svg', marketId: 12, symbol: 'NYSE:SNOW', type: 'stock' },
  { name: 'UBER', fullName: 'Uber', logo: '/uber.svg', marketId: 13, symbol: 'NYSE:UBER', type: 'stock' },
  { name: 'HOOD', fullName: 'Robinhood', logo: '/robinhood.svg', marketId: 14, symbol: 'NASDAQ:HOOD', type: 'stock' },
  { name: 'ABNB', fullName: 'Airbnb', logo: '/airbnb.svg', marketId: 15, symbol: 'NASDAQ:ABNB', type: 'stock' },
];

const marketSymbolMap = {
  'BTC-USDC': 'BTC-USD',
  'ETH-USDC': 'ETH-USD',
  'SOL-USDC': 'SOL-USD',
  'DOGE-USDC': 'DOGE-USD',
  'ADA-USDC': 'ADA-USD',
  'TSLA': 'TSLA',
  'NVDA': 'NVDA',
  'META': 'META',
  'PLTR': 'PLTR',
  'SNOW': 'SNOW',
  'UBER': 'UBER',
  'HOOD': 'HOOD',
  'ABNB': 'ABNB',
};

function formatNumber(num) {
  if (typeof num !== 'number') return num;
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString();
}

const TradePage = ({ selectedMarket: propSelectedMarket }) => {
  const [selectedMarket, setSelectedMarket] = useState(propSelectedMarket || markets[0]);

  // Update local state when prop changes
  useEffect(() => {
    if (propSelectedMarket) {
      setSelectedMarket(propSelectedMarket);
    }
  }, [propSelectedMarket]);

  const styles = {
    container: {
      width: '100%',
      padding: '8px 24px 0',
      background: 'linear-gradient(-45deg, #0c0c1e 0%, #161b22 25%, #1a1a36 50%, #0d1117 75%, #0c0c1e 100%)',
      backgroundSize: '400% 400%',
      animation: 'trade-background-flow 20s ease infinite',
      color: '#c9d1d9',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    },
    tradeHeader: {
      display: 'flex',
      alignItems: 'stretch',
      background: '#10131a',
      borderBottom: '1px solid #23263a',
      height: '60px',
      flexShrink: 0,
    },
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 350px 350px',
      gridTemplateRows: 'auto 1fr',
      gap: '8px',
      height: 'calc(100vh - 210px)',
      minHeight: '600px',
      flex: 1,
    },
    chartSection: {
      gridColumn: '1',
      gridRow: '1 / 3',
      display: 'flex',
      flexDirection: 'column',
      gap: '0'
    },
    chartContainer: {
      background: 'linear-gradient(145deg, rgba(26, 26, 54, 0.9) 0%, rgba(22, 27, 34, 0.95) 50%, rgba(13, 17, 23, 0.9) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '4px',
      overflow: 'hidden',
      flex: 1,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    },
    orderBookContainer: {
      gridColumn: '2',
      gridRow: '1 / 3',
      background: 'linear-gradient(145deg, rgba(26, 26, 54, 0.9) 0%, rgba(22, 27, 34, 0.95) 50%, rgba(13, 17, 23, 0.9) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '4px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    },
    tradeFormContainer: {
      gridColumn: '3',
      gridRow: '1 / 3',
      background: 'linear-gradient(145deg, rgba(26, 26, 54, 0.9) 0%, rgba(22, 27, 34, 0.95) 50%, rgba(13, 17, 23, 0.9) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '4px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    },
    footer: {
      width: '100%',
      textAlign: 'center',
      color: '#8b949e',
      fontSize: '0.75rem',
      marginTop: '12px',
      letterSpacing: '0.03em',
      opacity: 0.5,
      userSelect: 'none',
    },
    creditLink: {
      color: '#2EBD85',
      textDecoration: 'none',
      fontWeight: 700,
      marginLeft: 4,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    },
  };

  return (
    <>
      <style>{`
        @keyframes trade-background-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @media (max-width: 1400px) {
          .main-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto auto auto !important;
            height: auto !important;
          }
          .chart-section {
            grid-column: 1 !important;
            grid-row: 1 !important;
          }
          .orderbook-container {
            grid-column: 1 !important;
            grid-row: 2 !important;
          }
          .tradeform-container {
            grid-column: 1 !important;
            grid-row: 3 !important;
          }
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.mainGrid} className="main-grid">
          <div style={styles.chartSection} className="chart-section">
            <div style={styles.tradeHeader}>
              <MarketSelector
                markets={markets}
                allMarkets={allAvailableMarkets}
                selectedMarket={selectedMarket}
                onMarketChange={setSelectedMarket}
              />
              <EnhancedMarketHeader selectedMarket={selectedMarket} />
            </div>
            <div style={styles.chartContainer}>
              <Chart selectedMarket={selectedMarket} />
            </div>
          </div>
          <div style={styles.orderBookContainer} className="orderbook-container">
            <OrderBook selectedMarket={selectedMarket} />
          </div>
          <div style={styles.tradeFormContainer} className="tradeform-container">
            <TradeForm selectedMarket={selectedMarket} />
          </div>
        </div>
        <div style={styles.footer}>
          Made with <span role="img" aria-label="love">❤️‍🔥</span> by{' '}
          <a
            href="https://github.com/dmtrung14"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.creditLink}
          >
            <FaGithub size={16} style={{ verticalAlign: 'middle' }} /> dmtrung14
          </a>
        </div>
      </div>
    </>
  );
};

export default TradePage;
