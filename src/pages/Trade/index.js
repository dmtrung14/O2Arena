import React, { useState, useEffect } from 'react';
import { FaGithub } from 'react-icons/fa';
import MarketSelector from '../../components/MarketSelector';
import Chart from '../../components/Chart';
import OrderBook from '../../components/OrderBook';
import TradeForm from '../../components/TradeForm';

const markets = [
  { name: 'BTC-USDC', logo: '/bitcoin.svg', marketId: 4, symbol: 'BINANCE:BTCUSDT' },
  { name: 'ETH-USDC', logo: '/ethereum.svg', marketId: 3, symbol: 'BINANCE:ETHUSDT' },
  { name: 'SOL-USDC', logo: '/solana.svg', marketId: 5, symbol: 'BINANCE:SOLUSDT' },
  { name: 'DOGE-USDC', logo: '/dogecoin.svg', marketId: 6, symbol: 'BINANCE:DOGEUSDT' },
  { name: 'ADA-USDC', logo: '/cardano.svg', marketId: 7, symbol: 'BINANCE:ADAUSDT' },
  { name: 'TSLA', logo: '/tesla.svg', marketId: 8, symbol: 'NASDAQ:TSLA' },
  { name: 'NVDA', logo: '/nvidia.svg', marketId: 9, symbol: 'NASDAQ:NVDA' },
  { name: 'META', logo: '/meta.svg', marketId: 10, symbol: 'NASDAQ:META' },
];

const allAvailableMarkets = [
  // Crypto
  { name: 'BTC-USDC', logo: '/bitcoin.svg', marketId: 4, symbol: 'BINANCE:BTCUSDT', type: 'crypto' },
  { name: 'ETH-USDC', logo: '/ethereum.svg', marketId: 3, symbol: 'BINANCE:ETHUSDT', type: 'crypto' },
  { name: 'SOL-USDC', logo: '/solana.svg', marketId: 5, symbol: 'BINANCE:SOLUSDT', type: 'crypto' },
  { name: 'DOGE-USDC', logo: '/dogecoin.svg', marketId: 6, symbol: 'BINANCE:DOGEUSDT', type: 'crypto' },
  { name: 'ADA-USDC', logo: '/cardano.svg', marketId: 7, symbol: 'BINANCE:ADAUSDT', type: 'crypto' },
  
  // Stocks
  { name: 'TSLA', logo: '/tesla.svg', marketId: 8, symbol: 'NASDAQ:TSLA', type: 'stock' },
  { name: 'NVDA', logo: '/nvidia.svg', marketId: 9, symbol: 'NASDAQ:NVDA', type: 'stock' },
  { name: 'META', logo: '/meta.svg', marketId: 10, symbol: 'NASDAQ:META', type: 'stock' },
  { name: 'PLTR', logo: '/palantir.svg', marketId: 11, symbol: 'NYSE:PLTR', type: 'stock' },
  { name: 'SNOW', logo: '/snowflake.svg', marketId: 12, symbol: 'NYSE:SNOW', type: 'stock' },
  { name: 'UBER', logo: '/uber.svg', marketId: 13, symbol: 'NYSE:UBER', type: 'stock' },
  { name: 'HOOD', logo: '/robinhood.svg', marketId: 14, symbol: 'NASDAQ:HOOD', type: 'stock' },
  { name: 'ABNB', logo: '/airbnb.svg', marketId: 15, symbol: 'NASDAQ:ABNB', type: 'stock' },
];

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
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 350px 350px',
      gridTemplateRows: 'auto 1fr',
      gap: '0',
      height: 'calc(100vh - 200px)',
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
    }
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
            <MarketSelector
              markets={markets}
              allMarkets={allAvailableMarkets}
              selectedMarket={selectedMarket}
              onMarketChange={setSelectedMarket}
            />
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
