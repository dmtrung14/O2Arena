import React from 'react';
import { FaGoogle, FaMicrosoft, FaGithub } from 'react-icons/fa';
import './AuthModal.css';

// TODO: Please add actual icon assets for these.
const googleIcon = '/google-icon.svg';
const microsoftIcon = '/microsoft-icon.svg';
const githubIcon = '/github-icon.svg';

function AuthModal({ onClose }) {
  const handleGoogleSignIn = () => {
    console.log('Attempting to sign in with Google...');
    // Future implementation of Google Sign-In
  };

  const handleMicrosoftSignIn = () => {
    console.log('Attempting to sign in with Microsoft...');
    // Future implementation of Microsoft Sign-In
  };

  const handleGitHubSignIn = () => {
    console.log('Attempting to sign in with GitHub for algo trading...');
    // Future implementation of GitHub Sign-In
  };
  
  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-content" onClick={e => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>Log in or sign up</h2>
          <button onClick={onClose} className="auth-modal-close-btn">&times;</button>
        </div>
        <div className="auth-modal-body">
          <button className="auth-option-btn" onClick={handleGoogleSignIn}>
            <FaGoogle className="auth-option-btn-icon" />
            Continue with Google
          </button>
          <button className="auth-option-btn" onClick={handleMicrosoftSignIn}>
            <FaMicrosoft className="auth-option-btn-icon" />
            Continue with Microsoft
          </button>
          <button className="auth-option-btn" onClick={handleGitHubSignIn}>
            <FaGithub className="auth-option-btn-icon" />
            Continue with GitHub
          </button>
        </div>
        <div className="auth-modal-footer">
            <p>For institutional inquiries, please <a href="mailto:support@o2.xyz">contact us</a>.</p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal; 