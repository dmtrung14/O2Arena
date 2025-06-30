import React, { useState, useEffect } from 'react';
import './Portfolio.css';
import { useAuth } from '../App';
import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, query, updateDoc } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import CreateSubaccountModal from '../components/CreateSubaccountModal';

const Portfolio = () => {
    const { user } = useAuth();
    const [subaccounts, setSubaccounts] = useState([]);
    const [selectedSubaccount, setSelectedSubaccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        fetchSubaccounts();
    }, [user]);

    // Calculate PnL based on historical data
    const calculatePnL = (subaccount) => {
        if (!subaccount || !subaccount.accountValue) return { pnl: 0, pnlPercent: 0 };
        
        const currentValue = subaccount.accountValue;
        const previousValue = subaccount.previousValue || currentValue;
        
        const pnl = currentValue - previousValue;
        const pnlPercent = previousValue > 0 ? ((pnl / previousValue) * 100) : 0;
        
        return { pnl, pnlPercent };
    };

    // Update historical values daily
    const updateHistoricalValues = async (subaccount) => {
        if (!user || !subaccount) return;
        
        const today = new Date().toDateString();
        const lastUpdate = subaccount.lastValueUpdate;
        
        // Only update once per day
        if (lastUpdate === today) return;
        
        const subaccountRef = doc(db, 'portfolios', user.uid, 'subaccounts', subaccount.id);
        
        try {
            await updateDoc(subaccountRef, {
                previousValue: subaccount.accountValue,
                lastValueUpdate: today
            });
        } catch (error) {
            console.error("Error updating historical values:", error);
        }
    };

    const fetchSubaccounts = async () => {
        if (!user) return;
        setLoading(true);
        const subaccountsColRef = collection(db, 'portfolios', user.uid, 'subaccounts');
        try {
            const q = query(subaccountsColRef);
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                setSubaccounts([]);
                setSelectedSubaccount(null);
            } else {
                const fetchedSubaccounts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Update historical values for each subaccount
                fetchedSubaccounts.forEach(updateHistoricalValues);
                
                setSubaccounts(fetchedSubaccounts);
                setSelectedSubaccount(fetchedSubaccounts[0]);
            }
        } catch (error) {
            console.error("Error fetching subaccounts:", error);
        }
        setLoading(false);
    };

    const handleCreateSubaccount = async (newSubaccountData) => {
        if (!user) return;
        const subaccountDocRef = doc(db, 'portfolios', user.uid, 'subaccounts', newSubaccountData.id);
        try {
            // Initialize with historical tracking
            const today = new Date().toDateString();
            const subaccountWithHistory = {
                ...newSubaccountData,
                previousValue: newSubaccountData.accountValue,
                lastValueUpdate: today
            };
            
            await setDoc(subaccountDocRef, subaccountWithHistory);
            setIsCreateModalOpen(false);
            fetchSubaccounts();
        } catch (error) {
            console.error("Error creating subaccount:", error);
        }
    };

    const filteredSubaccounts = subaccounts.filter(subaccount =>
        subaccount.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subaccount.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderOverview = () => {
        if (!selectedSubaccount) return null;
        
        const { pnl, pnlPercent } = calculatePnL(selectedSubaccount);
        const isPositive = pnl >= 0;
        
        return (
            <div className="overview-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Value</div>
                    <div className="stat-value">
                        ${selectedSubaccount.accountValue?.toLocaleString() || '0'}
                    </div>
                    <div className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">24h PnL</div>
                    <div className="stat-value">
                        ${Math.abs(pnl).toLocaleString()}
                    </div>
                    <div className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : '-'}${Math.abs(pnl).toLocaleString()}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Open Positions</div>
                    <div className="stat-value">
                        {selectedSubaccount.positions?.length || 0}
                    </div>
                    <div className="stat-change neutral">Active</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Blockchain</div>
                    <div className="stat-value">
                        {selectedSubaccount.blockchain?.toUpperCase() || 'N/A'}
                    </div>
                    <div className="stat-change neutral">Network</div>
                </div>
            </div>
        );
    };

    const renderPositions = () => {
        if (!selectedSubaccount) return null;
        
        if (!selectedSubaccount.positions?.length) {
            return (
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <h3>No Open Positions</h3>
                    <p>Start trading to see your positions here</p>
                </div>
            );
        }
        return (
            <div className="positions-list">
                {selectedSubaccount.positions.map((position, index) => (
                    <div key={index} className="position-item">
                        <div className="position-symbol">{position.symbol}</div>
                        <div className="position-side">{position.side}</div>
                        <div className="position-size">{position.size}</div>
                        <div className="position-pnl positive">+${position.pnl}</div>
                    </div>
                ))}
            </div>
        );
    };

    const renderOrders = () => {
        if (!selectedSubaccount) return null;
        
        if (!selectedSubaccount.openOrders?.length) {
            return (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No Open Orders</h3>
                    <p>Place orders to see them here</p>
                </div>
            );
        }
        return (
            <div className="orders-list">
                {selectedSubaccount.openOrders.map((order, index) => (
                    <div key={index} className="order-item">
                        <div className="order-symbol">{order.symbol}</div>
                        <div className="order-type">{order.type}</div>
                        <div className="order-price">${order.price}</div>
                        <div className="order-status pending">Pending</div>
                    </div>
                ))}
            </div>
        );
    };

    const renderHistory = () => {
        if (!selectedSubaccount) return null;
        
        if (!selectedSubaccount.tradeHistory?.length) {
            return (
                <div className="empty-state">
                    <div className="empty-icon">📈</div>
                    <h3>No Trade History</h3>
                    <p>Your completed trades will appear here</p>
                </div>
            );
        }
        return (
            <div className="history-list">
                {selectedSubaccount.tradeHistory.map((trade, index) => (
                    <div key={index} className="trade-item">
                        <div className="trade-symbol">{trade.symbol}</div>
                        <div className="trade-side">{trade.side}</div>
                        <div className="trade-price">${trade.price}</div>
                        <div className="trade-time">{trade.time}</div>
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="portfolio-page">
                <div className="loading-container">
                    <LoadingSpinner size={50} />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="portfolio-page">
                <div className="auth-required">
                    <h2>Sign In Required</h2>
                    <p>Please sign in to view your portfolio</p>
                </div>
            </div>
        );
    }

    if (subaccounts.length === 0) {
        return (
            <div className="portfolio-page">
                <div className="empty-portfolio">
                    <div className="empty-icon">💼</div>
                    <h2>Welcome to Your Portfolio</h2>
                    <p>Create your first subaccount to start trading</p>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)} 
                        className="create-account-btn"
                    >
                        Create Subaccount
                    </button>
                </div>
                <CreateSubaccountModal 
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateSubaccount}
                    existingNames={[]}
                />
            </div>
        );
    }

    return (
        <div className="portfolio-page">
            <CreateSubaccountModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateSubaccount}
                existingNames={subaccounts.map(s => s.name)}
            />
            
            {/* Header */}
            <div className="portfolio-header">
                <div className="header-left">
                    <h1>Portfolio</h1>
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search subaccounts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)} 
                    className="create-account-btn"
                >
                    + New Subaccount
                </button>
            </div>

            {/* Subaccount Selector */}
            {filteredSubaccounts.length > 0 && (
                <div className="subaccount-selector">
                    {filteredSubaccounts.map((subaccount) => (
                        <button
                            key={subaccount.id}
                            onClick={() => setSelectedSubaccount(subaccount)}
                            className={`subaccount-tab ${selectedSubaccount?.id === subaccount.id ? 'active' : ''}`}
                        >
                            <div className="subaccount-name">{subaccount.name}</div>
                            <div className="subaccount-value">
                                ${subaccount.accountValue?.toLocaleString() || '0'}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Main Content */}
            {selectedSubaccount && (
                <div className="portfolio-content">
                    {/* Account Info */}
                    <div className="account-info">
                        <div className="account-header">
                            <h2>{selectedSubaccount.name}</h2>
                            <div className="account-id">ID: {selectedSubaccount.id}</div>
                        </div>
                        <div className="account-network">
                            {selectedSubaccount.blockchain?.toUpperCase()} Network
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="content-tabs">
                        <button 
                            onClick={() => setActiveTab('overview')} 
                            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                        >
                            Overview
                        </button>
                        <button 
                            onClick={() => setActiveTab('positions')} 
                            className={`tab-button ${activeTab === 'positions' ? 'active' : ''}`}
                        >
                            Positions
                        </button>
                        <button 
                            onClick={() => setActiveTab('orders')} 
                            className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
                        >
                            Orders
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')} 
                            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                        >
                            History
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'positions' && renderPositions()}
                        {activeTab === 'orders' && renderOrders()}
                        {activeTab === 'history' && renderHistory()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
