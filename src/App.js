import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import MarketSelector from './components/MarketSelector';
import Chart from './components/Chart';
import OrderBook from './components/OrderBook';
import TradeForm from './components/TradeForm';
import Portfolio from './pages/Portfolio';
import Markets from './pages/Markets';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/Profile';
import TradePage from './pages/Trade';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SubaccountProvider } from './context/SubaccountContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ ...firebaseUser, ...userDoc.data() });
        } else {
          setUser(firebaseUser); // User exists in auth but not yet in firestore
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && (
        <SubaccountProvider>
          {children}
        </SubaccountProvider>
      )}
    </AuthContext.Provider>
  );
};

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

// All available markets for search functionality
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

function PageTitleManager({ selectedMarket }) {
  const location = useLocation();
  const [currentPrice, setCurrentPrice] = useState(null);

  useEffect(() => {
    const fetchPrice = async () => {
      if (!selectedMarket) return;
      try {
        const response = await fetch(`https://zo-devnet.n1.xyz/orderbook?market_id=${selectedMarket.marketId}`);
        const data = await response.json();
        if (data.asks && data.asks.length > 0) {
          const price = data.asks[0][0];
          setCurrentPrice(price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
        }
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    };

    let interval;
    if (location.pathname === '/trade') {
      fetchPrice();
      interval = setInterval(fetchPrice, 2000);
    } else {
      setCurrentPrice(null);
    }

    return () => clearInterval(interval);
  }, [location.pathname, selectedMarket]);

  useEffect(() => {
    switch (location.pathname) {
      case '/':
        document.title = 'Oxygen Sandbox';
        break;
      case '/markets':
        document.title = 'O2 | Markets';
        break;
      case '/portfolio':
        document.title = 'O2 | Portfolio';
        break;
      case '/trade':
        if (currentPrice && selectedMarket) {
          document.title = `$${currentPrice} | ${selectedMarket.name}`;
        } else if (selectedMarket) {
          document.title = selectedMarket.name;
        }
        break;
      default:
        document.title = 'O2 Arena';
    }
  }, [location.pathname, currentPrice, selectedMarket]);

  return null;
}

function App() {
  const [selectedMarket, setSelectedMarket] = useState(markets[0]);

  return (
    <Router>
      <AuthProvider>
        <PageTitleManager selectedMarket={selectedMarket} />
        <div className="app">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/trade" element={
              <>
                <Header />
                <TradePage selectedMarket={selectedMarket} />
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
            <Route path="/profile" element={
                <ProtectedRoute>
                    <Header />
                    <ProfilePage />
                </ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return null; // or a loading spinner
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
};

export default App;
