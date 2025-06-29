import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import './Header.css';
import AuthModal from './AuthModal';

function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleSignInClick = () => {
    setIsAuthModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="logo-link">
            <div className="logo">O2</div>
          </Link>
          <nav className="nav-links">
            <NavLink to="/trade" className={({ isActive }) => isActive ? 'active' : ''} end>Trade</NavLink>
            <NavLink to="/portfolio" className={({ isActive }) => isActive ? 'active' : ''}>Portfolio</NavLink>
            <NavLink to="/markets" className={({ isActive }) => isActive ? 'active' : ''}>Markets</NavLink>
          </nav>
        </div>
        <div className="header-right">
          <button className="connect-wallet-btn" onClick={handleSignInClick}>Sign In</button>
        </div>
      </header>
      {isAuthModalOpen && <AuthModal onClose={handleCloseModal} />}
    </>
  );
}

export default Header;
