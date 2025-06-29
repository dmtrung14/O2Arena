import React, { useEffect, useRef } from 'react';

function Chart({ selectedMarket }) {
  const container = useRef(null);

  useEffect(() => {
    if (container.current && selectedMarket && selectedMarket.symbol) {
      // Clear any existing widget
      container.current.innerHTML = '';
      
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        new window.TradingView.widget({
          autosize: true,
          symbol: selectedMarket.symbol,
          interval: '60',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          container_id: container.current.id,
          overrides: {
              "paneProperties.background": "#000000",
              "paneProperties.vertGridProperties.color": "#2A2E39",
              "paneProperties.horzGridProperties.color": "#2A2E39",
              "symbolWatermarkProperties.transparency": 90,
              "scalesProperties.textColor": "#AAA",
          }
        });
      };
      container.current.appendChild(script);
    }
  }, [selectedMarket]);

  return (
    <div 
      id="tradingview_chart_container" 
      ref={container}
      style={{ height: '100%', width: '100%' }}
    />
  );
}

export default Chart; 