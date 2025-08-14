import React, { useState } from 'react';
import { ChainSelectorProps } from './types';

// Default styles that can be overridden
const defaultStyles = {
    container: {
        display: 'inline-block',
        position: 'relative' as const
    },
    select: {
        padding: '8px 32px 8px 12px',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        backgroundColor: 'white',
        fontSize: '14px',
        cursor: 'pointer',
        appearance: 'none' as const,
        minWidth: '160px',
        transition: 'all 0.2s ease'
    },
    selectHover: {
        borderColor: '#3b82f6'
    },
    selectDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed'
    },
    selectArrow: {
        position: 'absolute' as const,
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none' as const,
        color: '#6b7280'
    },
    option: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    chainDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        display: 'inline-block'
    },
    networkInfo: {
        fontSize: '12px',
        color: '#6b7280',
        marginTop: '4px'
    }
};

// Mock chain options - in a real app, these would come from BlockchainService
const CHAIN_OPTIONS = [
    {
        value: 'ethereum-local',
        label: 'Ethereum',
        network: 'Local Network',
        color: '#627eea'
    },
    {
        value: 'ethereum-sepolia',
        label: 'Ethereum',
        network: 'Sepolia Testnet',
        color: '#627eea'
    },
    {
        value: 'ethereum-mainnet',
        label: 'Ethereum',
        network: 'Mainnet',
        color: '#627eea'
    },
    {
        value: 'stellar-testnet',
        label: 'Stellar',
        network: 'Testnet',
        color: '#7c3aed'
    },
    {
        value: 'stellar-mainnet',
        label: 'Stellar',
        network: 'Mainnet',
        color: '#7c3aed'
    }
];

export const ChainSelector = ({
    selectedChainId,
    onChainChange,
    disabled = false,
    className
}: ChainSelectorProps) => {
    const [isHovered, setIsHovered] = useState(false);

    const selectedOption = CHAIN_OPTIONS.find(opt => opt.value === selectedChainId) || CHAIN_OPTIONS[0];

    const handleChange = (e: any) => {
        const newChainId = e.target.value;
        onChainChange(newChainId);
    };

    const selectStyle = {
        ...defaultStyles.select,
        ...(isHovered && !disabled ? defaultStyles.selectHover : {}),
        ...(disabled ? defaultStyles.selectDisabled : {})
    };

    return (
        <div className={className} style={defaultStyles.container}>
            {/* Select wrapper with arrow */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <select
                    value={selectedChainId}
                    onChange={handleChange}
                    disabled={disabled}
                    style={selectStyle}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {CHAIN_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label} - {option.network}
                        </option>
                    ))}
                </select>

                {/* Custom arrow icon */}
                <span style={defaultStyles.selectArrow}>▼</span>
            </div>

            {/* Network info display */}
            <div style={defaultStyles.networkInfo}>
                <span style={{ ...defaultStyles.chainDot, backgroundColor: selectedOption.color }} />
                <span style={{ marginLeft: '6px' }}>
                    {selectedOption.network}
                </span>
            </div>
        </div>
    );
};