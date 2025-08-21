import React, { useState, useEffect } from 'react';
import { WalletSelectionModalProps, WalletProvider } from './types';
import { getWalletsForChain } from './utils/walletConfig';
import { Setting2 } from 'iconsax-react';

// Default styles that can be overridden
const defaultStyles = {
    modal: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '480px',
        width: '90%',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column' as const,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
    },
    title: {
        fontSize: '20px',
        fontWeight: 600,
        margin: 0
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        padding: '4px',
        color: '#6b7280'
    },
    walletList: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
        maxHeight: '400px',
        overflowY: 'auto' as const,
        paddingRight: '8px'
    },
    walletItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backgroundColor: 'white'
    },
    walletItemHover: {
        borderColor: '#3b82f6',
        backgroundColor: '#f3f4f6'
    },
    walletLogo: {
        width: '48px',
        height: '48px',
        marginRight: '16px',
        objectFit: 'contain' as const
    },
    walletInfo: {
        flex: 1
    },
    walletName: {
        fontSize: '16px',
        fontWeight: 500,
        marginBottom: '4px'
    },
    walletDescription: {
        fontSize: '14px',
        color: '#6b7280'
    },
    noWalletsMessage: {
        textAlign: 'center' as const,
        padding: '32px',
        color: '#6b7280'
    },
    chainIndicator: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 12px',
        backgroundColor: '#f3f4f6',
        borderRadius: '16px',
        fontSize: '14px',
        marginBottom: '16px'
    },
    chainDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%'
    }
};

export const WalletSelectionModal = ({
    visible,
    onClose,
    selectedChain,
    onWalletSelect
}) => {
    const [hoveredWallet, setHoveredWallet] = useState(null);
    const [installedWallets, setInstalledWallets] = useState(new Set());
    const isDev = process.env.NODE_ENV === 'development';

    // Check which wallets are installed
    useEffect(() => {
        const checkInstalledWallets = () => {
            const installed = new Set<string>();
            
            // Check for MetaMask
            if (typeof window !== 'undefined' && (window as any).ethereum) {
                installed.add(WalletProvider.METAMASK);
            }
            
            // Check for Freighter
            if (typeof window !== 'undefined' && (window as any).freighter) {
                installed.add(WalletProvider.FREIGHTER);
            }
            
            // Dev wallet is always "installed" in dev mode
            if (isDev) {
                installed.add(WalletProvider.DEV);
            }
            
            setInstalledWallets(installed);
        };
        
        checkInstalledWallets();
        
        // Also check after a delay in case extensions load slowly
        setTimeout(checkInstalledWallets, 1000);
    }, [isDev]);

    const handleModalClick = (e: any) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleWalletClick = (provider: WalletProvider, isInstalled: boolean) => {
        if (!isInstalled) {
            // Get wallet info for download URL
            const walletInfo = getWalletsForChain(selectedChain).find(w => w.id === provider);
            if (walletInfo && walletInfo.downloadUrl) {
                window.open(walletInfo.downloadUrl, '_blank');
            }
            return;
        }
        onWalletSelect(provider);
        onClose();
    };

    if (!visible) return null;

    // Get wallets but filter out Dev wallet if we're showing it separately
    let wallets = getWalletsForChain(selectedChain);
    if (isDev) {
        // Filter out Dev wallet since we show it separately at the top
        wallets = wallets.filter(w => w.id !== WalletProvider.DEV);
    }
    const blockchainType = selectedChain.split('-')[0];
    const chainColor = blockchainType === 'ethereum' ? '#627eea' : '#7c3aed';
    const chainName = blockchainType === 'ethereum' ? 'Ethereum' : 'Stellar';

    return (
        <div style={defaultStyles.modal} onClick={handleModalClick}>
            <div style={defaultStyles.modalContent}>
                <div style={defaultStyles.header}>
                    <h2 style={defaultStyles.title}>Connect Wallet</h2>
                    <button
                        style={defaultStyles.closeButton}
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                <div style={defaultStyles.chainIndicator}>
                    <span style={{ ...defaultStyles.chainDot, backgroundColor: chainColor }} />
                    <span>{chainName} Network</span>
                </div>

                <div style={defaultStyles.walletList}>
                    {/* Dev Wallet Option (only in dev mode) */}
                    {isDev && (
                        <div
                            style={{
                                ...defaultStyles.walletItem,
                                ...(hoveredWallet === 'dev' ? defaultStyles.walletItemHover : {}),
                                cursor: 'pointer'
                            }}
                            onMouseEnter={() => setHoveredWallet('dev')}
                            onMouseLeave={() => setHoveredWallet(null)}
                            onClick={() => handleWalletClick(WalletProvider.DEV, true)}
                        >
                            <div style={{
                                ...defaultStyles.walletLogo,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#f3f4f6'
                            }}>
                                <Setting2 size="24" color="#6b7280" />
                            </div>
                            <div style={defaultStyles.walletInfo}>
                                <div style={defaultStyles.walletName}>Dev Wallet</div>
                                <div style={defaultStyles.walletDescription}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>Development Account</span>
                                        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                            {blockchainType === 'ethereum'
                                                ? '0x742d...2bd9e'
                                                : 'GBZXN7...NMADI'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Regular Wallet Options */}
                    {wallets.length > 0 ? (
                        wallets.map((wallet) => {
                            const isInstalled = installedWallets.has(wallet.id as string);
                            const isDisabled = !isInstalled && wallet.id !== WalletProvider.DEV;
                            
                            return (
                                <div
                                    key={wallet.id}
                                    style={{
                                        ...defaultStyles.walletItem,
                                        ...(hoveredWallet === wallet.id && !isDisabled ? defaultStyles.walletItemHover : {}),
                                        opacity: isDisabled ? 0.5 : 1,
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        position: 'relative' as const
                                    }}
                                    onMouseEnter={() => !isDisabled && setHoveredWallet(wallet.id)}
                                    onMouseLeave={() => setHoveredWallet(null)}
                                    onClick={() => handleWalletClick(wallet.id as WalletProvider, isInstalled)}
                                >
                                    <img
                                        src={wallet.logo}
                                        alt={`${wallet.name} logo`}
                                        style={{
                                            ...defaultStyles.walletLogo,
                                            filter: isDisabled ? 'grayscale(100%)' : 'none'
                                        }}
                                    />
                                    <div style={defaultStyles.walletInfo}>
                                        <div style={defaultStyles.walletName}>{wallet.name}</div>
                                        <div style={defaultStyles.walletDescription}>
                                            {isDisabled 
                                                ? `Click to install ${wallet.name}`
                                                : `Connect using ${wallet.name}`
                                            }
                                        </div>
                                    </div>
                                    {isDisabled && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            backgroundColor: '#fbbf24',
                                            color: '#78350f',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 600
                                        }}>
                                            Not Installed
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        !isDev && (
                            <div style={defaultStyles.noWalletsMessage}>
                                No wallets available for {chainName} network
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};