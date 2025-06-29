import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 24, alignment = 'center' }) => {
    const alignmentStyle = {
        justifyContent: 'center'
    };

    if (alignment === 'right') {
        alignmentStyle.justifyContent = 'flex-end';
    } else if (alignment === 'left') {
        alignmentStyle.justifyContent = 'flex-start';
    }

    return (
        <div className="loading-spinner-container" style={alignmentStyle}>
            <img src={'/logo.png'} alt="Loading..." className="loading-logo" style={{ width: size, height: size }}/>
        </div>
    );
};

export default LoadingSpinner; 