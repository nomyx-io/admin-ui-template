import React, { useState, useEffect } from 'react';
import { ConnectButtonProps } from './types';
import { Setting2, Link2 } from 'iconsax-react';

// Default styles that can be overridden
const defaultStyles = {
    button: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#3b82f6',
        color: 'white'
    },
    buttonHover: {
        backgroundColor: '#2563eb',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    },
    buttonConnected: {
        backgroundColor: '#10b981',
        color: 'white'
    },
    buttonConnecting: {
        backgroundColor: '#6b7280',
        cursor: 'wait'
    },
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed'
    },
    addressDisplay: {
        fontFamily: 'monospace',
        fontSize: '13px'
    },
    spinner: {
        display: 'inline-block',
        width: '14px',
        height: '14px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
    }
};

// Add keyframe animations
const keyframes = `
@keyframes spin {
    to { transform: rotate(360deg); }
}
@keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
}
`;

// Truncate address for display
const truncateAddress = (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const ConnectButton = ({
    selectedChain,
    isConnected,
    isConnecting,
    account,
    onConnect,
    onDisconnect,
    className
}: ConnectButtonProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const isDev = process.env.NODE_ENV === 'development';

    // Inject spinner animation styles
    useEffect(() => {
        const styleId = 'connect-button-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = keyframes;
            document.head.appendChild(style);
        }
    }, []);

    const handleClick = () => {
        if (isConnected) {
            onDisconnect();
        } else if (!isConnecting) {
            onConnect();
        }
    };

    const getButtonStyle = () => {
        let style = { ...defaultStyles.button };

        if (isConnecting) {
            style = { ...style, ...defaultStyles.buttonConnecting };
        } else if (isConnected) {
            style = { ...style, ...defaultStyles.buttonConnected };
        }

        if (isHovered && !isConnecting) {
            style = { ...style, ...defaultStyles.buttonHover };
        }

        if (isConnecting) {
            style = { ...style, ...defaultStyles.buttonDisabled };
        }

        return style;
    };

    const getButtonContent = () => {
        if (isConnecting) {
            return (
                <>
                    <span style={defaultStyles.spinner} />
                    <span>Connecting...</span>
                </>
            );
        }

        if (isConnected && account) {
            return (
                <>
                    {isDev && (
                        <Setting2 size="16" title="Dev Mode" style={{ marginRight: '4px' }} />
                    )}
                    <span style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#10b981',
                        borderRadius: '50%',
                        animation: isDev ? 'pulse 2s ease-in-out infinite' : 'none'
                    }} />
                    <span style={defaultStyles.addressDisplay}>
                        {truncateAddress(account)}
                    </span>
                </>
            );
        }

        return 'Connect Wallet';
    };

    return (
        <button
            className={className}
            style={getButtonStyle()}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={isConnecting}
        >
            {getButtonContent()}
        </button>
    );
};