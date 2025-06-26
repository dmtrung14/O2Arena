import React, { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import './Markets.css';

const marketInfo = {
  4: { name: 'Bitcoin', symbol: 'BTC-USDC', logo: '/bitcoin.svg', coingeckoId: 'bitcoin' },
  3: { name: 'Ethereum', symbol: 'ETH-USDC', logo: '/ethereum.svg', coingeckoId: 'ethereum' },
  5: { name: 'Solana', symbol: 'SOL-USDC', logo: '/solana.svg', coingeckoId: 'solana' },
  // Add other markets if needed
};

const fetchChartData = async (coingeckoId) => {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=1`);
    const data = await response.json();
    return data.prices.map(price => ({ value: price[1] }));
  } catch (error) {
    console.error("Failed to fetch chart data:", error);
    return [];
  }
};

const formatVolume = (volume) => {
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toFixed(2);
};

function Markets() {
  const [markets, setMarkets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('https://zo-devnet.n1.xyz/stats');
        const data = await response.json();
        
        const formattedMarkets = await Promise.all(
          data.markets
            .filter(market => marketInfo[market.marketId])
            .map(async (market) => {
              const chartData = await fetchChartData(marketInfo[market.marketId].coingeckoId);
              const firstPrice = chartData[0]?.value;
              const lastPrice = chartData[chartData.length - 1]?.value;
              const change24h = firstPrice && lastPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
              const volumeUsd = market.volume24h * market.indexPrice[0];

              return {
                ...market,
                ...marketInfo[market.marketId],
                sparklineData: chartData,
                change24h,
                volumeUsd,
              };
            })
        );
        setMarkets(formattedMarkets);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
      }
    };
    fetchMarketData();
  }, []);
  
  const filteredMarkets = markets.filter(market => 
    market.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    market.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topMarkets = filteredMarkets.slice(0, 3);

  return (
    <div className="markets-page">
      <div className="top-cards-container">
        {topMarkets.map(market => (
          <div key={market.marketId} className="market-card">
            <div className="card-header">
              <div className="card-header-left">
                <p className="card-market-name">{market.name}</p>
                <div className="card-price-container">
                  <p className="card-price">${market.indexPrice[0].toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p className={`card-change ${market.change24h >= 0 ? 'positive' : 'negative'}`}>
                    {market.change24h.toFixed(2)}%
                  </p>
                </div>
                <p className="card-volume">${market.volumeUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <img src={market.logo} alt={market.name} className="card-logo" />
            </div>
            <div className="card-sparkline">
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={market.sparklineData}>
                  <defs>
                    <linearGradient id={`color${market.marketId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={market.change24h >= 0 ? '#2EBD85' : '#F6465D'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={market.change24h >= 0 ? '#2EBD85' : '#F6465D'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <Area type="monotone" dataKey="value" stroke={market.change24h >= 0 ? '#2EBD85' : '#F6465D'} strokeWidth={2} fill={`url(#color${market.marketId})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="markets-search-filter">
        <input 
          type="text" 
          placeholder="Search token..." 
          className="search-token-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-tabs">
          {['All', 'Favs', 'Recently Listed', 'Meme', 'AI & Big Data', 'DeFi', 'Layer 1', 'Layer 2'].map(tab => (
            <button key={tab} className={tab === 'All' ? 'active' : ''}>{tab}</button>
          ))}
        </div>
      </div>

      <div className="markets-table-container">
        <table className="markets-table">
          <thead>
            <tr>
              <th>Market</th>
              <th>Index Price</th>
              <th>Mark Price</th>
              <th>24h Volume</th>
              <th>24h High/24h Low</th>
              <th>24h Trend</th>
              <th>Open Interest</th>
            </tr>
          </thead>
          <tbody>
            {filteredMarkets.map(market => (
              <tr key={market.marketId}>
                <td>
                  <div className="market-name-cell">
                    <img src={market.logo} alt={market.name} />
                    <div>
                      <p>{market.name}</p>
                      <p>{market.symbol}</p>
                    </div>
                  </div>
                </td>
                <td>${market.indexPrice[0].toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${market.perpStats.mark_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${formatVolume(market.volume24h * market.indexPrice[0])}</td>
                <td>
                  <div>
                    <p>${market.high24h.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p className="low-price">${market.low24h.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                </td>
                <td>
                  <div className="table-sparkline">
                    <ResponsiveContainer width={100} height={40}>
                      <AreaChart data={market.sparklineData}>
                        <YAxis domain={['dataMin', 'dataMax']} hide />
                        <Area type="monotone" dataKey="value" stroke={market.change24h >= 0 ? '#2EBD85' : '#F6465D'} strokeWidth={2} fill="transparent" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </td>
                <td>${(market.perpStats.open_interest * market.indexPrice[0]).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Markets;
