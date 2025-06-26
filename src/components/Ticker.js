import React from 'react';
import './Ticker.css';

const coinLogos = [
  { src: '/bitcoin.svg', name: 'Bitcoin' },
  { src: '/ethereum.svg', name: 'Ethereum' },
  { src: '/solana.svg', name: 'Solana' },
  { src: '/cardano.svg', name: 'Cardano' },
  { src: '/dogecoin.svg', name: 'Dogecoin' },
];

const techCompanyLogos = [
  { src: '/meta.svg', name: 'Meta' },
  { src: '/airbnb.svg', name: 'Airbnb' },
  { src: '/uber.svg', name: 'Uber' },
  { src: '/tesla.svg', name: 'Tesla' },
  { src: '/stripe.svg', name: 'Stripe' },
];

const startupLogos = [
  { src: '/nvidia.svg', name: 'NVIDIA' },
  { src: '/palantir.svg', name: 'Palantir' },
  { src: '/snowflake.svg', name: 'Snowflake' },
  { src: '/robinhood.svg', name: 'Robinhood' },
  { src: '/databricks.svg', name: 'Databricks' },
];

// Duplicate logos to ensure seamless looping
const extendedCoinLogos = [...coinLogos, ...coinLogos, ...coinLogos, ...coinLogos];
const extendedTechLogos = [...techCompanyLogos, ...techCompanyLogos, ...techCompanyLogos, ...techCompanyLogos];
const extendedStartupLogos = [...startupLogos, ...startupLogos, ...startupLogos, ...startupLogos];

function Ticker() {
  return (
    <div className="ticker-container">
      <div className="ticker-track animate-right-to-left">
        {extendedCoinLogos.map((logo, index) => (
          <img key={`coin-${index}`} src={logo.src} alt={logo.name} className="ticker-logo" />
        ))}
      </div>
      <div className="ticker-track animate-left-to-right">
        {extendedTechLogos.map((logo, index) => (
          <img key={`tech-${index}`} src={logo.src} alt={logo.name} className="ticker-logo" />
        ))}
      </div>
      <div className="ticker-track animate-right-to-left-delay">
        {extendedStartupLogos.map((logo, index) => (
          <img key={`startup-${index}`} src={logo.src} alt={logo.name} className="ticker-logo" />
        ))}
      </div>
    </div>
  );
}

export default Ticker; 