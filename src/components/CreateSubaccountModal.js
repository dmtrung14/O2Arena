import React, { useState, useEffect } from 'react';
import './CreateSubaccountModal.css';
import { db } from '../firebase';
import { doc, collection } from 'firebase/firestore';
import { FaClipboard } from 'react-icons/fa';

const BLOCKCHAINS = [
    { id: 'usd', name: 'USD (Default)', description: 'Trade all assets (stocks and crypto). Crypto trades incur a higher fee.' },
    { id: 'btc', name: 'Bitcoin', description: 'Trade only Bitcoin and BTC-paired assets.' },
    { id: 'eth', name: 'Ethereum', description: 'Trade only Ethereum and ERC-20 assets.' },
    { id: 'sol', name: 'Solana', description: 'Trade only Solana and SPL assets.' }
];

const CreateSubaccountModal = ({ isOpen, onClose, onCreate, existingNames }) => {
    const [generatedId, setGeneratedId] = useState('');
    const [name, setName] = useState('');
    const [blockchain, setBlockchain] = useState('usd');
    const [initialCapital, setInitialCapital] = useState(1000);
    const [nameError, setNameError] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setGeneratedId(doc(collection(db, 'temp')).id);
            setName('');
            setBlockchain('usd');
            setInitialCapital(1000);
            setNameError('');
            setCopySuccess('');
            setShowTooltip(false);
        }
    }, [isOpen]);
    
    const handleNameChange = (e) => {
        const val = e.target.value;
        setName(val);
        setNameError(existingNames.includes(val) ? 'This name is already taken.' : '');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedId).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const handleCapitalChange = (e) => {
        const val = e.target.value;
        if (val === '') setInitialCapital('');
        else setInitialCapital(Math.max(1, Math.min(25000, Number(val))));
    };

    const handleCapitalBlur = () => {
        if (initialCapital === '') setInitialCapital(1);
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

    return (
        <div className="sub-modal__backdrop">
            <div className="sub-modal__content">
                <div className="sub-modal__header">
                    <h2>Create New Subaccount</h2>
                    <button onClick={onClose} className="sub-modal__close">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="sub-modal__body">
                    <div className="sub-modal__group">
                        <label>Subaccount ID</label>
                        <div className="sub-modal__readonly-row">
                            <input type="text" value={generatedId} readOnly className="sub-modal__readonly-input" />
                            <button type="button" onClick={handleCopy} className="sub-modal__copy-btn">
                                {copySuccess ? 'Copied!' : <FaClipboard />}
                            </button>
                        </div>
                    </div>
                    <div className="sub-modal__group">
                        <label htmlFor="subaccountName">Subaccount Name</label>
                        <input 
                            id="subaccountName"
                            type="text" 
                            value={name} 
                            onChange={handleNameChange}
                            placeholder="e.g., Crypto Portfolio"
                            className={`sub-modal__input${nameError ? ' sub-modal__input--error' : ''}`}
                        />
                        {nameError && <p className="sub-modal__error">{nameError}</p>}
                    </div>
                    <div className="sub-modal__group">
                        <label>Blockchain</label>
                        <div className="sub-modal__blockchain-row">
                            <select value={blockchain} onChange={e => setBlockchain(e.target.value)} className="sub-modal__select">
                                {BLOCKCHAINS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <div
                                className="sub-modal__info-icon-wrapper"
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                                tabIndex={0}
                                onFocus={() => setShowTooltip(true)}
                                onBlur={() => setShowTooltip(false)}
                                style={{ position: 'relative' }}
                            >
                                <span className="sub-modal__info-icon">i</span>
                                {showTooltip && (
                                    <div className="sub-modal__tooltip">
                                        {BLOCKCHAINS.find(b => b.id === blockchain)?.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="sub-modal__group">
                        <label>Initial Capital</label>
                        <div className="sub-modal__capital-row">
                            <span className="sub-modal__currency">$</span>
                            <input 
                                type="number" 
                                value={initialCapital} 
                                onChange={handleCapitalChange}
                                onBlur={handleCapitalBlur}
                                className="sub-modal__input sub-modal__capital-input"
                                min={1}
                                max={25000}
                            />
                        </div>
                    </div>
                    <div className="sub-modal__footer">
                        <button type="button" onClick={onClose} className="sub-modal__btn sub-modal__btn--cancel">Cancel</button>
                        <button type="submit" className="sub-modal__btn sub-modal__btn--create" disabled={!!nameError || !name}>Create Account</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSubaccountModal;
