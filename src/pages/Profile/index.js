import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import './style.css';
import LoadingSpinner from '../../components/LoadingSpinner';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [nicknameStatus, setNicknameStatus] = useState('idle'); // 'idle', 'checking', 'available', 'taken'
    const nicknameTimeoutRef = useRef(null);
    const [formData, setFormData] = useState({
        legalName: '',
        nickname: '',
        phoneNumber: '',
        email: '',
        photoURL: ''
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser({ ...currentUser, ...userData });
                    const initialNickname = userData.nickname || userData.displayName || '';
                    setFormData({
                        legalName: userData.legalName || '',
                        nickname: initialNickname,
                        phoneNumber: userData.phoneNumber || '',
                        email: userData.email || '',
                        photoURL: userData.photoURL || `https://api.dicebear.com/8.x/adventurer/svg?seed=${currentUser.uid}`
                    });
                    // If user already has a nickname, mark it as available (it's theirs)
                    if (initialNickname && initialNickname.trim().length > 0) {
                        // Use setTimeout to ensure state is updated after component render
                        setTimeout(() => setNicknameStatus('available'), 0);
                    } else {
                        setNicknameStatus('idle');
                    }
                }
            } else {
                navigate('/');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    // Effect to handle initial nickname status display
    useEffect(() => {
        if (user && formData.nickname && formData.nickname.trim().length > 0) {
            // If this is the user's existing nickname, mark as available immediately
            if (user.nickname === formData.nickname) {
                setNicknameStatus('available');
            }
        }
    }, [user, formData.nickname]);

    const checkNicknameUniqueness = async (nickname) => {
        if (!nickname || nickname.trim().length < 2) {
            setNicknameStatus('idle');
            return;
        }

        const trimmedNickname = nickname.trim();

        // If it's the user's current nickname, it's available
        if (user && user.nickname === trimmedNickname) {
            setNicknameStatus('available');
            return;
        }

        setNicknameStatus('checking');

        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('nickname', '==', trimmedNickname));
            const querySnapshot = await getDocs(q);
            
            // Check if any found user is NOT the current user
            let isAvailable = true;
            querySnapshot.forEach((doc) => {
                if (doc.id !== user?.uid) {
                    isAvailable = false;
                }
            });
            
            if (isAvailable) {
                setNicknameStatus('available');
            } else {
                setNicknameStatus('taken');
            }
        } catch (error) {
            console.error('Error checking nickname:', error);
            setNicknameStatus('idle');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));

        // Clear any existing error for this field
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Handle nickname checking with debounce
        if (name === 'nickname') {
            if (nicknameTimeoutRef.current) {
                clearTimeout(nicknameTimeoutRef.current);
            }
            
            nicknameTimeoutRef.current = setTimeout(() => {
                checkNicknameUniqueness(value);
            }, 500);
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.legalName.trim()) {
            errors.legalName = 'Legal name is required';
        }

        if (!formData.nickname.trim()) {
            errors.nickname = 'Nickname is required';
        } else if (formData.nickname.length < 2) {
            errors.nickname = 'Nickname must be at least 2 characters';
        } else if (nicknameStatus === 'taken') {
            errors.nickname = 'This nickname is already taken';
        }

        if (formData.phoneNumber && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
            errors.phoneNumber = 'Please enter a valid phone number';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm() || nicknameStatus === 'checking' || nicknameStatus === 'taken') {
            return;
        }

        if (user) {
            setSaving(true);
            const userDocRef = doc(db, 'users', user.uid);
            try {
                await updateDoc(userDocRef, {
                    legalName: formData.legalName,
                    nickname: formData.nickname,
                    phoneNumber: formData.phoneNumber,
                    photoURL: `https://api.dicebear.com/8.x/adventurer/svg?seed=${formData.nickname || user.uid}`
                });
                
                // Success animation delay before redirect
                setTimeout(() => {
                    navigate('/trade');
                }, 1000);
            } catch (error) {
                console.error("Error updating profile: ", error);
                setSaving(false);
            }
        }
    };

    const getNicknameIcon = () => {
        switch (nicknameStatus) {
            case 'checking':
                return <div className="nickname-icon checking">⏳</div>;
            case 'available':
                return <div className="nickname-icon available">✅</div>;
            case 'taken':
                return <div className="nickname-icon taken">❌</div>;
            default:
                return null;
        }
    };

    const getNicknameMessage = () => {
        switch (nicknameStatus) {
            case 'checking':
                return <span className="nickname-message checking">Checking availability...</span>;
            case 'available':
                return <span className="nickname-message available">✨ Available! Looking good!</span>;
            case 'taken':
                return <span className="nickname-message taken">😔 Sorry, this nickname is taken</span>;
            default:
                return null;
        }
    };

    if (loading || !user) {
        return (
            <div className="profile-page-loading">
                <LoadingSpinner size={80} />
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="profile-background"></div>
            <div className="profile-container">
                {/* Header Section */}
                <div className="profile-header">
                    <div className="header-icon">
                        <div className="icon-inner">👤</div>
                    </div>
                    <h1 className="profile-title">Complete Your Profile</h1>
                    <p className="profile-subtitle">Let's set up your trading identity</p>
                </div>

                {/* Avatar Section */}
                <div className="avatar-section">
                    <div className="avatar-container">
                        <img src={formData.photoURL} alt="Profile Avatar" className="profile-avatar" />
                        <div className="avatar-ring"></div>
                        <div className="avatar-glow"></div>
                    </div>
                    <p className="avatar-hint">Your avatar updates based on your nickname</p>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} className="profile-form">
                    {/* Email Field */}
                    <div className="form-group">
                        <label className="form-label">
                            <span className="label-icon">📧</span>
                            Email Address
                        </label>
                        <div className="input-wrapper">
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                disabled 
                                className="form-input form-input--disabled"
                            />
                            <div className="input-suffix">
                                <span className="verified-badge">✓ Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Legal Name Field */}
                    <div className="form-group">
                        <label className="form-label">
                            <span className="label-icon">🆔</span>
                            Legal Name
                        </label>
                        <div className="input-wrapper">
                            <input 
                                type="text" 
                                name="legalName" 
                                value={formData.legalName} 
                                onChange={handleChange}
                                placeholder="Enter your full legal name"
                                className={`form-input ${formErrors.legalName ? 'form-input--error' : ''}`}
                                required 
                            />
                        </div>
                        {formErrors.legalName && (
                            <div className="error-message">
                                <span className="error-icon">⚠️</span>
                                {formErrors.legalName}
                            </div>
                        )}
                    </div>

                    {/* Nickname Field */}
                    <div className="form-group">
                        <label className="form-label">
                            <span className="label-icon">✨</span>
                            Nickname
                        </label>
                        <div className="input-wrapper">
                            <input 
                                type="text" 
                                name="nickname" 
                                value={formData.nickname} 
                                onChange={handleChange}
                                placeholder="Choose a unique nickname"
                                className={`form-input ${
                                    formErrors.nickname || nicknameStatus === 'taken' ? 'form-input--error' : 
                                    nicknameStatus === 'available' ? 'form-input--success' : ''
                                }`}
                                required 
                            />
                            <div className="input-suffix">
                                {getNicknameIcon()}
                            </div>
                        </div>
                        {getNicknameMessage()}
                        {formErrors.nickname && (
                            <div className="error-message">
                                <span className="error-icon">⚠️</span>
                                {formErrors.nickname}
                            </div>
                        )}
                    </div>

                    {/* Phone Number Field */}
                    <div className="form-group">
                        <label className="form-label">
                            <span className="label-icon">📱</span>
                            Phone Number <span className="optional">(Optional)</span>
                        </label>
                        <div className="input-wrapper">
                            <input 
                                type="tel" 
                                name="phoneNumber" 
                                value={formData.phoneNumber} 
                                onChange={handleChange}
                                placeholder="(123) 456-7890"
                                className={`form-input ${formErrors.phoneNumber ? 'form-input--error' : ''}`}
                            />
                        </div>
                        {formErrors.phoneNumber && (
                            <div className="error-message">
                                <span className="error-icon">⚠️</span>
                                {formErrors.phoneNumber}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        className={`save-profile-btn ${saving ? 'saving' : ''}`}
                        disabled={saving || nicknameStatus === 'checking' || nicknameStatus === 'taken'}
                    >
                        {saving ? (
                            <>
                                <span className="btn-spinner">⏳</span>
                                <span className="btn-text">Saving Profile...</span>
                            </>
                        ) : (
                            <>
                                <span className="btn-text">Save & Continue to Trading</span>
                                <span className="btn-icon">🚀</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage; 