import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGoogle, FaMicrosoft, FaGithub } from 'react-icons/fa';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore"; 
import { auth, db } from '../firebase';
import './AuthModal.css';

function AuthModal({ onClose }) {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // User exists, redirect to trade page
        navigate('/trade');
      } else {
        // New user, create a document and redirect to profile page for more details
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}`, // Using DiceBear for avatar
          createdAt: new Date(),
          legalName: 'Account Name',
          nickname: user.email.split('@')[0]
        });
        navigate('/profile');
      }
      onClose(); // Close the modal on successful sign-in
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      // Handle errors here, such as displaying a notification to the user
    }
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