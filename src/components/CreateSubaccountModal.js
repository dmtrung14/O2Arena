import React, { useState, useEffect } from 'react';
import './CreateSubaccountModal.css';
import { db } from '../firebase';
import { doc, collection } from 'firebase/firestore';

const BLOCKCHAINS = [
    { 
        id: 'usd', 
        name: 'USD Portfolio', 
        icon: '💵',
        description: 'Trade all assets (stocks and crypto). Crypto trades incur a higher fee.',
        color: '#2EBD85'
    },
    { 
        id: 'btc', 
        name: 'Bitcoin', 
        icon: '₿',
        description: 'Trade only Bitcoin and BTC-paired assets.',
        color: '#F7931A'
    },
    { 
        id: 'eth', 
        name: 'Ethereum', 
        icon: 'Ξ',
        description: 'Trade only Ethereum and ERC-20 assets.',
        color: '#627EEA'
    },
    { 
        id: 'sol', 
        name: 'Solana', 
        icon: '◎',
        description: 'Trade only Solana and SPL assets.',
        color: '#9945FF'
    }
];

const CreateSubaccountModal = ({ isOpen, onClose, onCreate, existingNames }) => {
    const [generatedId, setGeneratedId] = useState('');
    const [name, setName] = useState('');
    const [blockchain, setBlockchain] = useState('usd');
    const [initialCapital, setInitialCapital] = useState(1000);
    const [nameError, setNameError] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            setGeneratedId(doc(collection(db, 'temp')).id);
            setName('');
            setBlockchain('usd');
            setInitialCapital(1000);
            setNameError('');
            setCopySuccess(false);
            setShowTooltip(false);
        }
    }, [isOpen]);
    
    const handleNameChange = (e) => {
        const val = e.target.value;
        setName(val);
        setNameError(existingNames.includes(val) ? 'This name is already taken.' : '');
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedId);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleCapitalChange = (e) => {
        const val = e.target.value;
        if (val === '') setInitialCapital('');
        else setInitialCapital(Math.max(1, Math.min(25000, Number(val))));
    };

    const handleCapitalBlur = () => {
        if (initialCapital === '') setInitialCapital(1);
    };

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => onClose(), 200);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || nameError) {
            setNameError('Please enter a valid, unique name.');
            return;
        }
        
        const newSubaccountData = {
            id: generatedId,
            name,
            blockchain,
            balance: initialCapital,
            accountValue: initialCapital,
            pnl: 0,
            pnlHistory: [{ date: new Date().toISOString(), value: 0 }],
            accountValueHistory: [{ date: new Date().toISOString(), value: initialCapital }],
            positions: [],
            openOrders: [],
            orderHistory: [],
            tradeHistory: [],
        };
        onCreate(newSubaccountData);
    };
    
    if (!isOpen) return null;

    const selectedBlockchain = BLOCKCHAINS.find(b => b.id === blockchain);

    return (
        <div className={`modal-backdrop ${isAnimating ? 'modal-backdrop--open' : ''}`}>
            <div className={`modal-container ${isAnimating ? 'modal-container--open' : ''}`}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-header-content">
                        <div className="modal-icon">
                            <div className="modal-icon-inner">✨</div>
                        </div>
                        <div className="modal-title-group">
                            <h2 className="modal-title">Create New Subaccount</h2>
                            <p className="modal-subtitle">Set up your trading portfolio</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="modal-close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Account ID Section */}
                    <div className="form-section">
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">🔑</span>
                                Account ID
                            </label>
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    value={generatedId} 
                                    readOnly 
                                    className="form-input form-input--readonly"
                                />
                                <button 
                                    type="button" 
                                    onClick={handleCopy} 
                                    className={`copy-button ${copySuccess ? 'copy-button--success' : ''}`}
                                >
                                    {copySuccess ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Account Name Section */}
                    <div className="form-section">
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">📝</span>
                                Account Name
                            </label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={handleNameChange}
                                placeholder="e.g., Crypto Portfolio, Day Trading, Long Term"
                                className={`form-input ${nameError ? 'form-input--error' : ''}`}
                            />
                            {nameError && (
                                <div className="error-message">
                                    <span className="error-icon">⚠️</span>
                                    {nameError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Blockchain Selection */}
                    <div className="form-section">
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">⛓️</span>
                                Blockchain Network
                            </label>
                            <div className="blockchain-grid">
                                {BLOCKCHAINS.map(chain => (
                                    <div 
                                        key={chain.id} 
                                        className={`blockchain-card ${blockchain === chain.id ? 'blockchain-card--selected' : ''}`}
                                        onClick={() => setBlockchain(chain.id)}
                                    >
                                        <div className="blockchain-icon" style={{ color: chain.color }}>
                                            {chain.icon}
                                        </div>
                                        <div className="blockchain-info">
                                            <div className="blockchain-name">{chain.name}</div>
                                            <div className="blockchain-desc">{chain.description}</div>
                                        </div>
                                        <div className="blockchain-radio">
                                            <div className={`radio-dot ${blockchain === chain.id ? 'radio-dot--active' : ''}`}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Initial Capital */}
                    <div className="form-section">
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">💰</span>
                                Initial Capital
                            </label>
                            <div className="capital-input-group">
                                <div className="currency-symbol">$</div>
                                <input 
                                    type="number" 
                                    value={initialCapital} 
                                    onChange={handleCapitalChange}
                                    onBlur={handleCapitalBlur}
                                    className="form-input capital-input"
                                    min={1}
                                    max={25000}
                                />
                                <div className="capital-range">
                                    <span>$1 - $25,000</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="modal-footer">
                        <button type="button" onClick={handleClose} className="btn btn--secondary">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn btn--primary" 
                            disabled={!!nameError || !name}
                        >
                            <span className="btn-text">Create Account</span>
                            <span className="btn-icon">🚀</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSubaccountModal;
