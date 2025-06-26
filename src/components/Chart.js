import React, { useEffect, useRef } from 'react';

function Chart() {
  const container = useRef(null);

  useEffect(() => {
    if (container.current) {
      // Remove any previous widget
      container.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        // eslint-disable-next-line no-undef
        new window.TradingView.widget({
          autosize: true,
          symbol: 'BINANCE:BTCUSDT',
          interval: '60',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          overrides: {
            "paneProperties.backgroundType": "solid",
            "paneProperties.background": "#000000",
            "paneProperties.vertGridProperties.color": "#2A2E39",
            "paneProperties.horzGridProperties.color": "#2A2E39",
          },
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          container_id: container.current.id,
        });
      };
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div
      id="tradingview_btc_chart"
      ref={container}
      className="tradingview-chart-container"
      style={{ flex: 1, minHeight: 0 }}
    />
  );
}

export default Chart; 