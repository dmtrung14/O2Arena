import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import './Markets.css';
import LoadingSpinner from '../components/LoadingSpinner';

const marketInfo = {
  'BTC-USD': { name: 'Bitcoin', apiSymbol: 'BTC-USD', type: 'crypto', logo: 'bitcoin.svg' },
  'ETH-USD': { name: 'Ethereum', apiSymbol: 'ETH-USD', type: 'crypto', logo: 'ethereum.svg' },
  'SOL-USD': { name: 'Solana', apiSymbol: 'SOL-USD', type: 'crypto', logo: 'solana.svg' },
  'DOGE-USD': { name: 'Dogecoin', apiSymbol: 'DOGE-USD', type: 'crypto', logo: 'dogecoin.svg' },
  'ADA-USD': { name: 'Cardano', apiSymbol: 'ADA-USD', type: 'crypto', logo: 'cardano.svg' },
  'META': { name: 'Meta', apiSymbol: 'META', type: 'stock', logo: 'meta.svg' },
  'PLTR': { name: 'Palantir', apiSymbol: 'PLTR', type: 'stock', logo: 'palantir.svg' },
  'TSLA': { name: 'Tesla', apiSymbol: 'TSLA', type: 'stock', logo: 'tesla.svg' },
  'NVDA': { name: 'Nvidia', apiSymbol: 'NVDA', type: 'stock', logo: 'nvidia.svg' },
  'SNOW': { name: 'Snowflake', apiSymbol: 'SNOW', type: 'stock', logo: 'snowflake.svg' },
  'UBER': { name: 'Uber', apiSymbol: 'UBER', type: 'stock', logo: 'uber.svg' },
  'RBNHD': { name: 'Robinhood', apiSymbol: 'HOOD', type: 'stock', logo: 'robinhood.svg' },
  'ARBNB': { name: 'Airbnb', apiSymbol: 'ABNB', type: 'stock', logo: 'airbnb.svg' },
};

const getStartDate = (range) => {
    const now = new Date();
    const date = new Date(); // Create a new date object to modify
    switch (range) {
        case '1D':
            date.setDate(now.getDate() - 1);
            return date;
        case '5D':
            date.setDate(now.getDate() - 5);
            return date;
        case '1M':
            date.setMonth(now.getMonth() - 1);
            return date;
        case '3M':
            date.setMonth(now.getMonth() - 3);
            return date;
        case '6M':
            date.setMonth(now.getMonth() - 6);
            return date;
        case '1Y':
            date.setFullYear(now.getFullYear() - 1);
            return date;
        case 'YTD':
            return new Date(now.getFullYear(), 0, 1);
        default:
            return new Date(now.getFullYear(), 0, 1); // Default to YTD
    }
};

const getInterval = (range) => {
    switch (range) {
        case '1D':
            return '5m';
        case '5D':
            return '60m';
        default:
            return '1d';
    }
};

function generateFlatLineData(symbol, range) {
    const data = [];
    const numPoints = 100;
    const now = new Date();
    const startDate = getStartDate(range);
    
    const timeDiff = now.getTime() - startDate.getTime();

    for (let i = 0; i < numPoints; i++) {
        const pointTimestamp = startDate.getTime() + (timeDiff * i / (numPoints - 1));
        data.push({
            date: new Date(pointTimestamp).toISOString(),
            price: 1,
        });
    }
    return data;
}

const formatNumber = (num) => {
    if (typeof num !== 'number') return num;
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toString();
};

const Markets = () => {
    const [markets, setMarkets] = useState([]);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState('YTD');

    const fetchMarketData = useCallback(async (market, range) => {
        try {
            const period2 = Math.floor(new Date().getTime() / 1000);

            // Chart data fetch setup
            const startDate = getStartDate(range);
            const period1 = Math.floor(startDate.getTime() / 1000);
            const interval = getInterval(range);
            const chartUrl = `http://localhost:3001/api/v8/finance/chart/${market.apiSymbol}?period1=${period1}&period2=${period2}&interval=${interval}`;
            
            // Volume data fetch setup
            const volumeStartDate = new Date();
            volumeStartDate.setDate(volumeStartDate.getDate() - 2); // Get last 2 days to be safe
            const volumePeriod1 = Math.floor(volumeStartDate.getTime() / 1000);
            const volumeUrl = `http://localhost:3001/api/v8/finance/chart/${market.apiSymbol}?period1=${volumePeriod1}&period2=${period2}&interval=1d`;

            const [chartResponse, volumeResponse] = await Promise.all([
                fetch(chartUrl),
                fetch(volumeUrl)
            ]);
            
            if (!chartResponse.ok) {
                console.error(`API request failed for ${market.apiSymbol} with status ${chartResponse.status}`);
                return null;
            }

            const data = await chartResponse.json();
            
            if (!data.chart.result || !data.chart.result[0].timestamp) {
                console.error(`Invalid data structure for ${market.apiSymbol}`);
                return null;
            }

            const result = data.chart.result[0];
            const meta = result.meta;
            const timestamps = result.timestamp;
            const prices = result.indicators.quote[0].close;

            if (!timestamps || !prices) {
                console.error(`Missing timestamps or prices for ${market.apiSymbol}`);
                return null;
            }

            const chartData = timestamps.map((ts, i) => ({
                date: new Date(ts * 1000).toISOString(),
                price: prices[i]
            })).filter(p => p.price != null);

            if (chartData.length === 0) return null;

            const marketCap = meta.marketCap;
            const currentPrice = meta.regularMarketPrice ?? chartData[chartData.length - 1]?.price;
            const firstPrice = chartData[0]?.price;

            const changePercent = firstPrice && currentPrice ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;

            let volume24h = null;
            if (volumeResponse.ok) {
                const volumeData = await volumeResponse.json();
                if (volumeData.chart.result && volumeData.chart.result[0].indicators.quote[0].volume) {
                    const volumes = volumeData.chart.result[0].indicators.quote[0].volume;
                    // Find the last non-null volume entry, which should be the most recent day's volume
                    for (let i = volumes.length - 1; i >= 0; i--) {
                        if (volumes[i] !== null) {
                            volume24h = volumes[i];
                            break;
                        }
                    }
                }
            } else {
                console.error(`Could not fetch 24h volume for ${market.apiSymbol}`);
            }

            return {
                ...market,
                price: currentPrice,
                change: changePercent,
                chartData,
                marketCap,
                volume24h,
            };
        } catch (error) {
            console.error(`Failed to fetch or process data for ${market.apiSymbol}:`, error);
            return null;
        }
    }, []);

    useEffect(() => {
        const fetchAllMarkets = async () => {
            const initialMarkets = Object.keys(marketInfo).map(symbol => ({
                id: symbol,
                ...marketInfo[symbol],
                price: 'Loading...',
                change: '...',
                chartData: [],
                marketCap: 'Loading...',
                volume24h: 'Loading...'
            }));

            setMarkets(initialMarkets);

            const promises = initialMarkets.map(m => fetchMarketData(m, timeRange));
            const results = await Promise.all(promises);

            const updatedMarkets = results.map((data, index) => {
                if (data) return data;
                
                const symbol = initialMarkets[index].id;
                return {
                    ...initialMarkets[index],
                    price: 'N/A',
                    change: 'N/A',
                    chartData: generateFlatLineData(symbol, timeRange),
                    marketCap: 'N/A',
                    volume24h: 'N/A',
                };
            });
            
            setMarkets(updatedMarkets);
        };

        fetchAllMarkets();
    }, [fetchMarketData, timeRange]);

    const handleRowClick = (marketId) => {
        // In a real app, you'd use React Router's useHistory or Link component
        // For this example, we'll just log to console to show intent
        console.log(`Navigating to trade page for ${marketId}`);
    };

    const filteredMarkets = markets.filter(market => {
        if (filter !== 'All' && market.type !== filter.toLowerCase()) {
            return false;
        }
        if (searchTerm && !market.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        return true;
    });

    const topFeatured = [...markets]
        .filter(m => typeof m.change === 'number')
        .sort((a, b) => b.change - a.change)
        .slice(0, 3);

    return (
        <div className="markets-page">
            <h1 className="page-title">Featured Markets</h1>
            <div className="markets-grid">
                {topFeatured.map(market => {
                     if (!market) return null;
                     const change = parseFloat(market.change);
                     return (
                        <div className="market-card" key={market.id}>
                            <div className="market-card-info">
                                <div className="market-card-name-and-logo">
                                    <img src={`/${market.logo}`} alt={market.name} className="market-icon" />
                                    <div className="market-card-name-group">
                                        <div className="market-card-symbol">{market.id}</div>
                                        <div className="market-card-company-name">{market.name}</div>
                                    </div>
                                </div>
                                <div className="market-card-price-group">
                                    <div className="market-card-price">
                                        {market.price === 'Loading...' ? <LoadingSpinner size={28} alignment="right" /> : (typeof market.price === 'number' ? `$${market.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : market.price)}
                                    </div>
                                    <div className={`market-card-change ${change >= 0 ? 'positive' : 'negative'}`}>
                                        {market.change === '...' ? <LoadingSpinner size={16} alignment="right" /> : (market.change !== 'N/A' ? `${parseFloat(market.change).toFixed(2)}%` : '...')}
                                    </div>
                                </div>
                            </div>
                            <div className="market-card-chart">
                                {market.chartData.length === 0 ? <LoadingSpinner size={40} /> : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={market.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id={`color${market.id}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={change >= 0 ? '#00C487' : '#FF5A5A'} stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor={change >= 0 ? '#00C487' : '#FF5A5A'} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <YAxis domain={['dataMin', 'dataMax']} hide={true} />
                                            <Area 
                                                type="monotone" 
                                                dataKey="price" 
                                                stroke={change >= 0 ? '#00C487' : '#FF5A5A'} 
                                                fillOpacity={1} 
                                                fill={`url(#color${market.id})`} 
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                     );
                 })}
            </div>

            <h1 className="page-title">All Markets</h1>
            <div className="markets-list-container">
                <div className="filters">
                    <div className="filter-buttons">
                        <button onClick={() => setFilter('All')} className={filter === 'All' ? 'active' : ''}>All</button>
                        <button onClick={() => setFilter('Stock')} className={filter === 'Stock' ? 'active' : ''}>Stocks</button>
                        <button onClick={() => setFilter('Crypto')} className={filter === 'Crypto' ? 'active' : ''}>Crypto</button>
                    </div>
                
                    <div className="search-and-filter-container">
                        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="time-range-selector">
                            <option value="1D">1D</option>
                            <option value="5D">5D</option>
                            <option value="1M">1M</option>
                            <option value="3M">3M</option>
                            <option value="6M">6M</option>
                            <option value="YTD">YTD</option>
                            <option value="1Y">1Y</option>
                        </select>
                        <div className="search-bar-container">
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="markets-list-header">
                    <div>Asset</div>
                    <div className="text-right">Price</div>
                    <div className="text-right">Change ({timeRange})</div>
                    <div className="text-right">Volume (24h)</div>
                    <div className="text-right">Chart ({timeRange})</div>
                    <div className="text-center">Trade</div>
                </div>

                <div>
                    {filteredMarkets.map(market => {
                        if (!market) return null;
                        const change = parseFloat(market.change);
                        return (
                            <div key={market.id} className="market-row-grid" onClick={() => handleRowClick(market.id)}>
                                <div className="asset-cell">
                                    <img src={`/${market.logo}`} alt={market.name} className="asset-icon" />
                                    <div>
                                        <p className="asset-name">{market.name}</p>
                                        <p className="asset-symbol">{market.id}</p>
                                    </div>
                                </div>
                                <div className="text-right">{market.price === 'Loading...' ? <LoadingSpinner size={20} alignment="right" /> : (typeof market.price === 'number' ? `$${market.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : market.price)}</div>
                                <div className={`text-right ${change >= 0 ? 'positive' : 'negative'}`}>{market.change === '...' ? <LoadingSpinner size={16} alignment="right" /> : (market.change !== 'N/A' ? `${parseFloat(market.change).toFixed(2)}%` : '...')}</div>
                                <div className="text-right">{market.volume24h === 'Loading...' ? <LoadingSpinner size={20} alignment="right" /> : (typeof market.volume24h === 'number' ? `$${formatNumber(market.volume24h)}` : 'N/A')}</div>
                                <div>
                                    <div className="list-chart">
                                        {market.chartData.length === 0 ? <LoadingSpinner size={30} /> : (
                                            <ResponsiveContainer width="100%" height={40}>
                                                <AreaChart data={market.chartData}>
                                                    <defs>
                                                        <linearGradient id={`colorList${market.id}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={change >= 0 ? '#00C487' : '#FF5A5A'} stopOpacity={0.8}/>
                                                            <stop offset="95%" stopColor={change >= 0 ? '#00C487' : '#FF5A5A'} stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <YAxis domain={['dataMin', 'dataMax']} hide={true} />
                                                    <Area type="monotone" dataKey="price" stroke={change >= 0 ? '#00C487' : '#FF5A5A'} fillOpacity={1} fill={`url(#colorList${market.id})`} strokeWidth={2}/>
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <button className="markets-trade-btn" onClick={(e) => { e.stopPropagation(); handleRowClick(market.id); }}>Trade</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Markets; 