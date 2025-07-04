import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, BarChart2, DollarSign, Activity, Maximize2 } from 'lucide-react';

const Stat = ({ icon, label, value, color, iconColor }) => (
  <div style={styles.stat}>
    <div style={{ ...styles.iconContainer, background: iconColor || 'rgba(124, 58, 237, 0.1)' }}>
      {React.createElement(icon, { size: 14, color: color || '#a78bfa' })}
    </div>
    <div>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
    </div>
  </div>
);

const EnhancedMarketHeader = ({ selectedMarket }) => {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const marketSymbolMap = {
    'BTC-USDC': 'BTC-USD', 'ETH-USDC': 'ETH-USD', 'SOL-USDC': 'SOL-USD',
    'DOGE-USDC': 'DOGE-USD', 'ADA-USDC': 'ADA-USD', 'TSLA': 'TSLA',
    'NVDA': 'NVDA', 'META': 'META', 'PLTR': 'PLTR', 'SNOW': 'SNOW',
    'UBER': 'UBER', 'HOOD': 'HOOD', 'ABNB': 'ABNB',
  };

  const formatNumber = (num) => {
    if (typeof num !== 'number') return 'N/A';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString('en-US', {maximumFractionDigits: 0});
  };

  useEffect(() => {
    const fetchMarketData = async () => {
      if (!selectedMarket) return;
      setLoading(true);
      const symbol = marketSymbolMap[selectedMarket.name] || selectedMarket.name;
      const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
      
      try {
        const period2 = Math.floor(new Date().getTime() / 1000);
        const url = `${API_BASE_URL}/api/v8/finance/chart/${symbol}?period1=${period2 - 86400 * 2}&period2=${period2}&interval=1d`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API error');
        
        const data = await response.json();
        if (!data.chart?.result?.[0]) throw new Error('No data');
        
        const result = data.chart.result[0];
        const meta = result.meta;
        const prices = result.indicators.quote[0].close;
        const volumes = result.indicators.quote[0].volume;
        
        const currentPrice = meta.regularMarketPrice ?? prices[prices.length - 1];
        const previousPrice = prices[0];
        const changePercent = previousPrice && currentPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
        
        const dayHigh = meta.regularMarketDayHigh;
        const dayLow = meta.regularMarketDayLow;
        
        setMarketData({
          price: currentPrice,
          change: changePercent,
          volume24h: volumes?.slice(-1)[0],
          marketCap: meta.marketCap,
          dayHigh,
          dayLow,
        });
      } catch (error) {
        console.error('Failed to fetch market data:', error);
        setMarketData(null);
      }
      setLoading(false);
    };

    fetchMarketData();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchMarketData, 30000);

    return () => clearInterval(intervalRef.current);
  }, [selectedMarket]);

  useEffect(() => {
    if (marketData && selectedMarket) {
      document.title = `$${marketData.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${selectedMarket.name}`;
    } else if (selectedMarket) {
      document.title = selectedMarket.name;
    }
  }, [marketData, selectedMarket]);

  if (loading) {
    return <div style={styles.loading}>Loading data...</div>;
  }

  if (!marketData) {
    return <div style={styles.error}>Failed to load market data</div>;
  }

  const isPositive = marketData.change >= 0;
  const changeColor = isPositive ? '#2EBD85' : '#F6465D';

  return (
    <div style={styles.container}>
      <div style={{ ...styles.priceStat, color: changeColor }}>
        <div style={styles.priceValue}>
          ${marketData.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={styles.priceChange}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span style={{ marginLeft: '4px' }}>{marketData.change.toFixed(2)}%</span>
        </div>
      </div>
      
      <div style={styles.separator}></div>
      
      <Stat
        icon={BarChart2}
        label="24h Volume"
        value={`$${formatNumber(marketData.volume24h)}`}
        iconColor="rgba(52, 211, 153, 0.1)"
        color="#34d399"
      />
      <Stat
        icon={DollarSign}
        label="Market Cap"
        value={`$${formatNumber(marketData.marketCap)}`}
        iconColor="rgba(96, 165, 250, 0.1)"
        color="#60a5fa"
      />
      <Stat
        icon={Activity}
        label="Day's High"
        value={`$${marketData.dayHigh?.toLocaleString('en-US', {minimumFractionDigits: 2})}`}
        iconColor="rgba(251, 146, 60, 0.1)"
        color="#fb923c"
      />
      <Stat
        icon={Activity}
        label="Day's Low"
        value={`$${marketData.dayLow?.toLocaleString('en-US', {minimumFractionDigits: 2})}`}
        iconColor="rgba(248, 113, 113, 0.1)"
        color="#f87171"
      />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: '0px',
    padding: '0 16px',
    background: '#10131a',
    height: '100%',
  },
  priceStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    fontFamily: 'SF Mono, Monaco, monospace',
    paddingRight: '16px',
  },
  priceValue: {
    fontSize: '20px',
    fontWeight: '700',
  },
  priceChange: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: '600',
  },
  separator: {
    width: '1px',
    height: '32px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconContainer: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: '11px',
    color: '#8b949e',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: '14px',
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'SF Mono, Monaco, monospace',
  },
  loading: {
    padding: '0 16px',
    color: '#8b949e',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  error: {
    padding: '0 16px',
    color: '#F6465D',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  }
};

export default EnhancedMarketHeader; 