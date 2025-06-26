import React from 'react';
import { Link } from 'react-router-dom';
import { FaGithub } from 'react-icons/fa';
import './LandingPage.css';
import Ticker from '../components/Ticker';

function LandingPage() {
  return (
    <div className="landing-page">
      <Ticker />
      <div className="left-pane">
        <div className="logo-background">
          O2
        </div>
        <div className="credit">
          Made with ❤️‍🔥 by <a href="https://github.com/dmtrung14" target="_blank" rel="noopener noreferrer"><FaGithub /> dmtrung14</a>
        </div>
      </div>
      <Link to="/trade" className="right-pane">
        <div className="trade-button">
          Trade
          <span className="arrow">↑</span>
        </div>
        <div className="light-source">
          <div className="smoke-effect"></div>
        </div>
      </Link>
    </div>
  );
}

export default LandingPage; 