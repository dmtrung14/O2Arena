import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import './style.css';
import LoadingSpinner from '../../components/LoadingSpinner';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        legalName: '',
        nickname: '',
        phoneNumber: '',
        email: '',
        photoURL: ''
    });

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser({ ...currentUser, ...userData });
                    setFormData({
                        legalName: userData.legalName || '',
                        nickname: userData.nickname || userData.displayName || '',
                        phoneNumber: userData.phoneNumber || '',
                        email: userData.email || '',
                        photoURL: userData.photoURL || `https://api.dicebear.com/8.x/adventurer/svg?seed=${currentUser.uid}`
                    });
                }
            } else {
                navigate('/'); // If no user, redirect to home
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (user) {
            setLoading(true);
            const userDocRef = doc(db, 'users', user.uid);
            try {
                await updateDoc(userDocRef, {
                    legalName: formData.legalName,
                    nickname: formData.nickname,
                    phoneNumber: formData.phoneNumber,
                    // Update photoURL if nickname changes, to keep avatar consistent
                    photoURL: `https://api.dicebear.com/8.x/adventurer/svg?seed=${formData.nickname || user.uid}`
                });
                navigate('/trade'); // Redirect to trade page after profile update
            } catch (error) {
                console.error("Error updating profile: ", error);
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading || !user) {
        return <div className="profile-page-loading"><LoadingSpinner size={80} /></div>;
    }

    return (
        <div className="profile-page">
            <div className="profile-container">
                <h1>Complete Your Profile</h1>
                <p>Welcome! Let's get your account set up.</p>
                <div className="avatar-section">
                    <img src={formData.photoURL} alt="User Avatar" className="profile-avatar" />
                </div>
                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" name="email" value={formData.email} disabled />
                    </div>
                    <div className="form-group">
                        <label htmlFor="legalName">Legal Name</label>
                        <input type="text" id="legalName" name="legalName" value={formData.legalName} onChange={handleChange} placeholder="e.g. John Doe" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="nickname">Nickname</label>
                        <input type="text" id="nickname" name="nickname" value={formData.nickname} onChange={handleChange} placeholder="e.g. Johnny" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phoneNumber">Phone Number</label>
                        <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="e.g. (123) 456-7890" />
                    </div>
                    <button type="submit" className="save-profile-btn" disabled={loading}>
                        {loading ? 'Saving...' : 'Save and Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage; 