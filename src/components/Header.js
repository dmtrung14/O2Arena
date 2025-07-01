import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import './Header.css';
import AuthModal from './AuthModal';
import { useAuth } from '../App';
import { useSubaccount } from '../context/SubaccountContext';
import { auth } from '../firebase';

function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user } = useAuth();
  const { selectedSubaccount } = useSubaccount();
  const navigate = useNavigate();

  const handleSignInClick = () => {
    setIsAuthModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
    setIsProfileMenuOpen(false);
  };

  const UserProfile = () => (
    <div className="user-profile" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
        <div className="user-info">
          {selectedSubaccount && (
            <div className="header-account-indicator">
              <span className="header-account-icon">💰</span>
              <div className="header-account-info">
                <span className="header-account-name">{selectedSubaccount.name}</span>
                <span className="header-account-balance">
                  ${(selectedSubaccount.balance || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </span>
              </div>
            </div>
          )}
          <span className="user-nickname">{user.nickname}</span>
        </div>
        <img src={user.photoURL} alt="User" className="user-avatar" />
        {isProfileMenuOpen && (
            <div className="profile-dropdown">
                <Link to="/profile" className="dropdown-item">Profile</Link>
                <div className="dropdown-item" onClick={handleLogout}>Log Out</div>
            </div>
        )}
    </div>
  );

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
            {user ? (
                <UserProfile />
            ) : (
                <button className="connect-wallet-btn" onClick={handleSignInClick}>Sign In</button>
            )}
        </div>
      </header>
      {isAuthModalOpen && !user && <AuthModal onClose={handleCloseModal} />}
    </>
  );
}

export default Header;
