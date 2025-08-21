import React, { useState, useEffect, useCallback } from 'react';
import { BlockchainSelectionManagerProps, WalletProvider, WalletConnectionState } from './types';
import { ChainConfigService } from '@nomyx/shared';
import { injectThemeStyles } from './styles';
import { ChainSelector } from './ChainSelector';
import { ConnectButton } from './ConnectButton';
import { WalletSelectionModal } from './WalletSelectionModal';
import { InfoCircle } from 'iconsax-react';

// Define theme colors using CSS variables for consistency
const getThemeColors = () => {
    // Check if CSS variables are defined, otherwise use defaults
    if (typeof window !== 'undefined' && window.getComputedStyle) {
        const root = document.documentElement;
        const styles = window.getComputedStyle(root);
        return {
            primaryColor: styles.getPropertyValue('--nomyx-primary-color').trim() || '#1568DB',
            primaryHover: styles.getPropertyValue('--nomyx-primary-hover').trim() || '#1257c0',
            borderColor: styles.getPropertyValue('--nomyx-border-color').trim() || '#e5e7eb',
            backgroundColor: styles.getPropertyValue('--nomyx-background-color').trim() || '#f9fafb',
            textColor: styles.getPropertyValue('--nomyx-text-color').trim() || '#000000',
            darkBorderColor: styles.getPropertyValue('--nomyx-dark-border-color').trim() || '#4b5563',
            darkBackgroundColor: styles.getPropertyValue('--nomyx-dark-background-color').trim() || '#374151'
        };
    }
    // Default colors
    return {
        primaryColor: '#1568DB',
        primaryHover: '#1257c0',
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
        textColor: '#000000',
        darkBorderColor: '#4b5563',
        darkBackgroundColor: '#374151'
    };
};

interface ChainConfig {
    type: string;
    networkName: string;
    chainId?: number;
    rpcUrl: string;
    contracts?: {
        DiamondFactory?: string;
        Diamond?: string;
        DiamondProxy?: string;
        [key: string]: any;
    };
    deployedAt?: string;
}

interface ChainConfigs {
    [chainId: string]: ChainConfig;
}

// ChainInfoTab component
const ChainInfoTab = ({ chainConfig, isDev, React }) => {
    if (!chainConfig) return null;

    const hasRequiredContracts = (config: ChainConfig) => {
        if (!config.contracts) return false;
        const hasMainContract = config.contracts.Diamond || config.contracts.DiamondProxy;
        return hasMainContract;
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            {isDev && (
                <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500
                }}>
                    🔧 Dev Mode Active
                </span>
            )}

            <div style={{
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div>
                    <strong>Type:</strong> {chainConfig.type}
                </div>
                <div>
                    <strong>Network:</strong> {chainConfig.networkName}
                </div>
                {chainConfig.chainId && (
                    <div>
                        <strong>Chain ID:</strong> {chainConfig.chainId}
                    </div>
                )}
                <div>
                    <strong>RPC URL:</strong>
                    <code style={{
                        marginLeft: '8px',
                        padding: '2px 6px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}>
                        {chainConfig.rpcUrl}
                    </code>
                </div>
            </div>

            <div style={{
                backgroundColor: hasRequiredContracts(chainConfig) ? '#d1fae5' : '#fee4e2',
                padding: '16px',
                borderRadius: '8px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                }}>
                    <strong>Contract Status:</strong>
                    {hasRequiredContracts(chainConfig) ? (
                        <span style={{ color: '#059669' }}>✅ Deployed</span>
                    ) : (
                        <span style={{ color: '#dc2626' }}>⚠️ Not Deployed</span>
                    )}
                </div>
                {chainConfig.deployedAt && (
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Deployed: {new Date(chainConfig.deployedAt).toLocaleString()}
                    </div>
                )}
            </div>

            {chainConfig.contracts && (
                <details style={{
                    backgroundColor: '#f3f4f6',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                }}>
                    <summary style={{ fontWeight: 500 }}>
                        Contract Addresses
                    </summary>
                    <div style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        {Object.entries(chainConfig.contracts).map(([key, value]) => {
                            if (typeof value === 'object' && value !== null) {
                                // Handle nested objects like facets
                                return (
                                    <details key={key} style={{ marginLeft: '12px' }}>
                                        <summary style={{ fontWeight: 500 }}>{key}:</summary>
                                        <div style={{ marginLeft: '12px', marginTop: '4px' }}>
                                            {Object.entries(value).map(([subKey, subValue]) => (
                                                <div key={subKey}>
                                                    <strong>{subKey}:</strong> {String(subValue) || '(not deployed)'}
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                );
                            }
                            return (
                                <div key={key}>
                                    <strong>{key}:</strong> {String(value) || '(not deployed)'}
                                </div>
                            );
                        })}
                    </div>
                </details>
            )}
        </div>
    );
};

// DiamondLoupeTab component
const DiamondLoupeTab = ({
    diamondLoupeInfo,
    loadingLoupe,
    React,
}) => {
    if (loadingLoupe) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#6b7280'
            }}>
                Loading Diamond Loupe information...
            </div>
        );
    }

    if (diamondLoupeInfo?.error) {
        return (
            <div style={{
                backgroundColor: '#fee4e2',
                padding: '16px',
                borderRadius: '8px',
                color: '#dc2626'
            }}>
                <strong>Error:</strong> {diamondLoupeInfo.error}
            </div>
        );
    }

    if (!diamondLoupeInfo) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#6b7280'
            }}>
                No Diamond Loupe information available
            </div>
        );
    }

    return (
        <>
            {/* Diamond Summary */}
            <div style={{
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '12px'
            }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Diamond Contract</h4>
                <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                        <strong>Address:</strong>
                        <code style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            {diamondLoupeInfo.deploymentInfo?.diamondAddress || 'Unknown'}
                        </code>
                    </div>
                    {diamondLoupeInfo.deploymentInfo?.owner && (
                        <div>
                            <strong>Owner:</strong>
                            <code style={{
                                marginLeft: '8px',
                                padding: '2px 6px',
                                backgroundColor: '#e5e7eb',
                                borderRadius: '4px',
                                fontSize: '12px'
                            }}>
                                {diamondLoupeInfo.deploymentInfo.owner}
                            </code>
                        </div>
                    )}
                    <div>
                        <strong>Total Facets:</strong> {diamondLoupeInfo.facetAddresses?.length || 0}
                    </div>
                    <div>
                        <strong>Total Functions:</strong> {diamondLoupeInfo.totalFunctions || 0}
                    </div>
                </div>
            </div>

            {/* Facets List */}
            <div style={{
                backgroundColor: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px',
                maxHeight: '400px',
                overflow: 'auto'
            }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Facets</h4>
                {diamondLoupeInfo.facets?.map((facet: any, index: number) => (
                    <details key={index} style={{
                        marginBottom: '8px',
                        backgroundColor: 'white',
                        padding: '12px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}>
                        <summary style={{ fontWeight: 500 }}>
                            {facet.name || `Facet ${index + 1}`}
                            <code style={{
                                marginLeft: '8px',
                                fontSize: '11px',
                                color: '#6b7280'
                            }}>
                                ({facet.functionSelectors?.length || 0} functions)
                            </code>
                        </summary>
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Address:</strong>
                                <code style={{
                                    marginLeft: '8px',
                                    padding: '2px 6px',
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: '4px',
                                    fontSize: '11px'
                                }}>
                                    {facet.facetAddress}
                                </code>
                            </div>
                            {facet.functionSelectors && facet.functionSelectors.length > 0 && (
                                <div>
                                    <strong>Function Selectors:</strong>
                                    <div style={{
                                        marginTop: '4px',
                                        marginLeft: '12px',
                                        fontSize: '11px',
                                        fontFamily: 'monospace'
                                    }}>
                                        {facet.functionSelectors.slice(0, 5).map((selector: string, idx: number) => (
                                            <div key={idx}>{selector}</div>
                                        ))}
                                        {facet.functionSelectors.length > 5 && (
                                            <div>... and {facet.functionSelectors.length - 5} more</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </details>
                ))}
            </div>
        </>
    );
};

// Default styles
const defaultStyles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
    },
    section: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    divider: {
        width: '1px',
        height: '32px',
        backgroundColor: '#e5e7eb'
    },
    networkInfo: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px'
    },
    label: {
        fontSize: '12px',
        color: '#6b7280',
        fontWeight: 500,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    },
    value: {
        fontSize: '14px',
        color: '#111827',
        fontWeight: 500
    },
    errorMessage: {
        color: '#ef4444',
        fontSize: '12px',
        marginTop: '8px'
    },
    logoutButton: {
        padding: '8px 16px',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    }
};

export const BlockchainSelectionManager = ({
    selectedChainId,
    onChainChange,
    onWalletConnect,
    onWalletDisconnect,
    onLogout,
    className,
    showNetworkInfo = true,
    showConnectButton = true,
    showLogoutButton = false,
    compact = false,
    darkMode
}: BlockchainSelectionManagerProps) => {
    const [chainConfigs, setChainConfigs] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('info');
    const [diamondLoupeInfo, setDiamondLoupeInfo] = useState(null);
    const [loadingLoupe, setLoadingLoupe] = useState(false);
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';

    // Load chain configurations
    useEffect(() => {
        const loadChainConfigs = async () => {
            // First try loading from ChainConfigService
            try {
                const configService = new ChainConfigService();
                const chains = await configService.getAllChains();

                if (chains && Object.keys(chains).length > 0) {
                    // Convert ChainContractConfig to ChainConfigs format
                    const convertedConfigs: ChainConfigs = {};
                    for (const [chainId, chainInfo] of Object.entries(chains)) {
                        // Determine chain type from chainId
                        const type = chainId.startsWith('stellar') ? 'stellar' : 'ethereum';
                        convertedConfigs[chainId] = {
                            ...chainInfo, // Spread first to include all properties
                            type, // Then override with the type
                        };
                    }
                    console.log('[BlockchainSelectionManager] Loaded chain configs from ChainConfigService:', convertedConfigs);
                    setChainConfigs(convertedConfigs);
                    return; // Success, exit early
                }
            } catch (serviceError) {
                console.warn('[BlockchainSelectionManager] ChainConfigService failed, will try HTTP fetch:', serviceError);
            }

            // Fallback to HTTP fetch if ChainConfigService fails
            try {
                // In Next.js, files in the public directory are served from the root
                // Fallback to default configs
                console.warn('[BlockchainSelectionManager] ChainConfigService failed, using defaults');
            } catch (error) {
                console.error('[BlockchainSelectionManager] Failed to load chain configs from HTTP:', error);

                // Set minimal default configs if all methods fail
                const defaultConfigs: ChainConfigs = {
                    'ethereum-local': {
                        type: 'ethereum',
                        networkName: 'localhost',
                        rpcUrl: 'http://127.0.0.1:8545'
                    },
                    'stellar-testnet': {
                        type: 'stellar',
                        networkName: 'testnet',
                        rpcUrl: 'https://soroban-testnet.stellar.org'
                    }
                };
                console.log('[BlockchainSelectionManager] Using default chain configs:', defaultConfigs);
                setChainConfigs(defaultConfigs);
            }
        };
        loadChainConfigs();
    }, []);

    // Load Diamond Loupe info
    const loadDiamondLoupeInfo = async () => {
        console.log('[BlockchainSelectionManager] loadDiamondLoupeInfo called for:', selectedChainId);
        console.log('[BlockchainSelectionManager] Current chainConfigs:', chainConfigs);

        const selectedConfig = selectedChainId && chainConfigs ? chainConfigs[selectedChainId] : null;
        console.log('[BlockchainSelectionManager] Selected config:', selectedConfig);

        if (!selectedConfig || !selectedConfig.contracts) {
            console.log('[BlockchainSelectionManager] No config or contracts found');
            return;
        }

        const diamondAddress = selectedConfig.contracts.Diamond || selectedConfig.contracts.DiamondProxy;
        if (!diamondAddress) {
            console.log(`[BlockchainSelectionManager] No Diamond contract address for ${selectedChainId}`);
            return;
        }
        console.log('[BlockchainSelectionManager] Diamond address found:', diamondAddress);

        try {
            setLoadingLoupe(true);

            // Import createBlockchainService from the index
            const { createBlockchainService } = await import('@nomyx/shared');
            const blockchainService = createBlockchainService(selectedChainId);

            // Get Diamond Loupe info
            const loupeInfo = await blockchainService.getDiamondLoupeInfo(diamondAddress);
            console.log(`[BlockchainSelectionManager] Diamond Loupe info loaded:`, loupeInfo);

            setDiamondLoupeInfo(loupeInfo);
            setLoadingLoupe(false);
        } catch (error) {
            console.error(`[BlockchainSelectionManager] Error loading Diamond Loupe info:`, error);
            setDiamondLoupeInfo({ error: error instanceof Error ? error.message : 'Failed to load Diamond Loupe info' });
            setLoadingLoupe(false);
        }
    };

    // Load saved wallet connections from localStorage
    const loadSavedWalletConnections = () => {
        try {
            const saved = localStorage.getItem('nomyx-wallet-connections');
            const connections = saved ? JSON.parse(saved) : {};
            console.log(`[BlockchainSelectionManager] Loaded saved connections:`, connections);
            return connections;
        } catch (error) {
            console.error('Failed to load saved wallet connections:', error);
            return {};
        }
    };

    // Save wallet connection to localStorage
    const saveWalletConnection = (chainId: string, account: string | null, provider: WalletProvider | null) => {
        try {
            const connections = loadSavedWalletConnections();
            if (account && provider) {
                connections[chainId] = { account, provider };
                console.log(`[BlockchainSelectionManager] Saving wallet connection for ${chainId}:`, { account, provider });
            } else {
                delete connections[chainId];
                console.log(`[BlockchainSelectionManager] Removing wallet connection for ${chainId}`);
            }
            localStorage.setItem('nomyx-wallet-connections', JSON.stringify(connections));
            console.log(`[BlockchainSelectionManager] Updated saved connections:`, connections);
        } catch (error) {
            console.error('Failed to save wallet connection:', error);
        }
    };

    const [walletState, setWalletState] = useState({
        isConnected: false,
        isConnecting: false,
        account: null,
        chainId: null,
        walletProvider: null,
        error: null
    });

    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showChainDropdown, setShowChainDropdown] = useState(false);
    const [showWalletDropdown, setShowWalletDropdown] = useState(false);
    const [isLoadingChainSwitch, setIsLoadingChainSwitch] = useState(false);

    // Inject theme styles on mount
    useEffect(() => {
        injectThemeStyles();
    }, []);

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.chain-dropdown-container')) {
                setShowChainDropdown(false);
            }
            if (!target.closest('.wallet-dropdown-container')) {
                setShowWalletDropdown(false);
            }
        };

        if (showChainDropdown || showWalletDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
        return undefined;
    }, [showChainDropdown, showWalletDropdown]);

    // Auto-connect from saved connections or dev mode
    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;

        // Only run auto-connect once on mount or when chain changes
        if (!walletState.isConnected && selectedChainId) {
            // Small delay to ensure blockchain service is ready
            timer = setTimeout(() => {
                // First check for saved connection
                const savedConnections = loadSavedWalletConnections();
                const savedConnection = savedConnections[selectedChainId];

                if (savedConnection) {
                    console.log(`[BlockchainSelectionManager] Auto-connecting to saved wallet for ${selectedChainId}:`, savedConnection);
                    // Auto-reconnect with saved connection
                    setWalletState({
                        isConnected: true,
                        isConnecting: false,
                        account: savedConnection.account,
                        chainId: selectedChainId,
                        walletProvider: savedConnection.provider,
                        error: null
                    });

                    if (onWalletConnect) {
                        onWalletConnect(savedConnection.account, savedConnection.provider);
                    }
                } else {
                    console.log(`[BlockchainSelectionManager] No saved connection for ${selectedChainId}`);

                    if (isDev) {
                        console.log(`[BlockchainSelectionManager] Auto-connecting with dev wallet for ${selectedChainId}`);
                        // Auto-connect with dev accounts if no saved connection
                        const chainType = selectedChainId.split('-')[0];
                        const devAccount = chainType === 'ethereum'
                            ? '0x742d35Cc6634C0532925a3b844Bc9e7595f2bd9e'  // Dev Ethereum account
                            : process.env.REACT_APP_STELLAR_DEV_ADDRESS || 'REQUIRES_BACKEND_CONFIG';  // Must be provided by backend

                        const provider = chainType === 'ethereum' ? WalletProvider.METAMASK : WalletProvider.FREIGHTER;

                        setWalletState({
                            isConnected: true,
                            isConnecting: false,
                            account: devAccount,
                            chainId: selectedChainId,
                            walletProvider: provider,
                            error: null
                        });

                        if (onWalletConnect) {
                            onWalletConnect(devAccount, provider);
                        }
                    }
                }
            }, 500); // 500ms delay to ensure blockchain service is ready
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [selectedChainId]); // Only depend on selectedChainId to trigger on mount and chain changes

    // Handle chain change
    const handleChainChange = useCallback((newChainId: string) => {
        // Save current connection before switching chains
        if (walletState.isConnected && walletState.account && walletState.walletProvider && selectedChainId) {
            saveWalletConnection(selectedChainId, walletState.account, walletState.walletProvider);
        }

        // For dev mode with dev wallet, update the address for the new chain
        if (isDev && walletState.isConnected && walletState.walletProvider === WalletProvider.DEV) {
            const chainType = newChainId.split('-')[0];
            const devAccount = chainType === 'ethereum'
                ? '0x75d26bd184b6947aBaBc8C82103004F899a40b69'  // Dev Ethereum account (shortened)
                : process.env.REACT_APP_STELLAR_DEV_ADDRESS || 'REQUIRES_BACKEND_CONFIG';  // Must be provided by backend
            
            console.log(`[BlockchainSelectionManager] Updating dev wallet address for ${newChainId}: ${devAccount.substring(0, 10)}...`);
            
            // Update wallet state with new address for the new chain
            setWalletState({
                isConnected: true,
                isConnecting: false,
                account: devAccount,
                chainId: newChainId,
                walletProvider: WalletProvider.DEV,
                error: null
            });
            
            // Call chain change
            onChainChange(newChainId);
            
            // Notify wallet connection with new address
            if (onWalletConnect) {
                onWalletConnect(devAccount, WalletProvider.DEV);
            }
        } else {
            // For non-dev mode or other wallets, disconnect when switching chains
            if (walletState.isConnected) {
                handleDisconnect(false); // Pass false to not clear saved connection
            }
            onChainChange(newChainId);
        }
    }, [isDev, walletState.isConnected, walletState.account, walletState.walletProvider, selectedChainId, onChainChange, onWalletConnect]);

    // Handle wallet connection
    const handleConnect = useCallback(() => {
        setShowWalletModal(true);
    }, []);

    // Handle wallet selection from modal
    const handleWalletSelect = useCallback(async (provider: WalletProvider) => {
        setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

        try {
            if (isDev || provider === WalletProvider.DEV) {
                // In dev mode or when dev wallet is selected, instantly connect with dev accounts
                await new Promise(resolve => setTimeout(resolve, 500)); // Short delay for UI feedback

                const chainType = selectedChainId.split('-')[0];
                const devAccount = chainType === 'ethereum'
                    ? '0x75d26bd184b6947aBaBc8C82103004F899a40b69'
                    : process.env.REACT_APP_STELLAR_DEV_ADDRESS || 'REQUIRES_BACKEND_CONFIG';

                console.log(`[BlockchainSelectionManager] Wallet selected: ${provider} Account: ${devAccount.substring(0, 10)}... Chain type: ${chainType}`);

                setWalletState({
                    isConnected: true,
                    isConnecting: false,
                    account: devAccount,
                    chainId: selectedChainId,
                    walletProvider: provider,
                    error: null
                });

                // Save the connection
                saveWalletConnection(selectedChainId, devAccount, provider);

                if (onWalletConnect) {
                    onWalletConnect(devAccount, provider);
                }
            } else {
                // In production, trigger actual wallet connection
                try {
                    // Import the blockchain service
                    const { createBlockchainService } = await import('@nomyx/shared');
                    const blockchainService = createBlockchainService(selectedChainId);

                    // Get chain info to determine which wallet to use
                    const chainInfo = blockchainService.getChainInfo();

                    if (chainInfo.chainType === 'ethereum' && provider === WalletProvider.METAMASK) {
                        // Check for MetaMask
                        const ethereum = (window as any).ethereum;
                        if (!ethereum) {
                            throw new Error('MetaMask not found. Please install MetaMask to connect.');
                        }

                        // Request account access
                        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                        const walletAddress = accounts[0];

                        // Validate address
                        if (!blockchainService.isValidAddress(walletAddress)) {
                            throw new Error('Invalid address received from wallet');
                        }

                        setWalletState({
                            isConnected: true,
                            isConnecting: false,
                            account: walletAddress,
                            chainId: selectedChainId,
                            walletProvider: provider,
                            error: null
                        });

                        // Save the connection
                        saveWalletConnection(selectedChainId, walletAddress, provider);

                        if (onWalletConnect) {
                            onWalletConnect(walletAddress, provider);
                        }

                    } else if (chainInfo.chainType === 'stellar' && provider === WalletProvider.FREIGHTER) {
                        // Check for Freighter
                        const freighter = (window as any).freighter;
                        if (!freighter) {
                            throw new Error('Freighter wallet not found. Please install Freighter to connect.');
                        }

                        // Request account access
                        const publicKey = await freighter.requestAccess();

                        // Validate address
                        if (!blockchainService.isValidAddress(publicKey)) {
                            throw new Error('Invalid address received from wallet');
                        }

                        setWalletState({
                            isConnected: true,
                            isConnecting: false,
                            account: publicKey,
                            chainId: selectedChainId,
                            walletProvider: provider,
                            error: null
                        });

                        // Save the connection
                        saveWalletConnection(selectedChainId, publicKey, provider);

                        if (onWalletConnect) {
                            onWalletConnect(publicKey, provider);
                        }

                    } else {
                        throw new Error(`Wallet provider ${provider} not supported for ${chainInfo.chainType}`);
                    }
                } catch (walletError) {
                    console.error('[BlockchainSelectionManager] Wallet connection failed:', walletError);
                    throw walletError;
                }
            }
        } catch (error) {
            setWalletState(prev => ({
                ...prev,
                isConnecting: false,
                error: error as Error
            }));
        }
    }, [isDev, selectedChainId, onWalletConnect]);

    // Handle wallet disconnection
    const handleDisconnect = useCallback((clearSaved: boolean = true) => {
        // Clear saved connection if requested (default true for manual disconnects)
        if (clearSaved && selectedChainId) {
            saveWalletConnection(selectedChainId, null, null);
        }

        setWalletState({
            isConnected: false,
            isConnecting: false,
            account: null,
            chainId: null,
            walletProvider: null,
            error: null
        });

        if (onWalletDisconnect) {
            onWalletDisconnect();
        }
    }, [selectedChainId, onWalletDisconnect]);

    // Get network display info
    const getNetworkInfo = () => {
        const chainType = selectedChainId.split('-')[0];
        const networkName = selectedChainId.split('-')[1];
        return {
            blockchain: chainType.charAt(0).toUpperCase() + chainType.slice(1),
            network: networkName.charAt(0).toUpperCase() + networkName.slice(1)
        };
    };

    const networkInfo = getNetworkInfo();

    // Detect dark mode (can be overridden by prop)
    const isDarkMode = darkMode !== undefined ? darkMode : 
        (typeof window !== 'undefined' && 
         (document.documentElement.classList.contains('dark') || 
          window.matchMedia('(prefers-color-scheme: dark)').matches));

    // Get theme colors
    const themeColors = getThemeColors();

    // Render compact mode (like admin portal)
    if (compact) {
        return (
            <>
                <div className={className} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid ' + (isDarkMode ? themeColors.darkBorderColor : themeColors.borderColor),
                    borderRadius: '8px',
                    padding: '4px',
                    backgroundColor: isDarkMode ? themeColors.darkBackgroundColor : themeColors.backgroundColor
                }}>
                    {/* Chain Info Button from nomyx-ts/components */}
                    <button
                        onClick={async () => {
                            setShowInfoModal(true);
                            setActiveModalTab('info');
                            setDiamondLoupeInfo(null);
                            if (!chainConfigs) {
                                try {
                                    // Try to reload from ChainConfigService
                                    const configService = new ChainConfigService();
                                    const chains = await configService.getAllChains();
                                    if (chains && Object.keys(chains).length > 0) {
                                        setChainConfigs(chains);
                                    }
                                } catch (error) {
                                    console.error('[BlockchainSelectionManager] Failed to load chain configs:', error);
                                }
                            }
                            loadDiamondLoupeInfo();
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px 12px',
                            backgroundColor: themeColors.primaryColor,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 500,
                            height: '32px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = themeColors.primaryHover;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = themeColors.primaryColor;
                        }}
                        title="Chain Information"
                        aria-label="Chain Information"
                    >
                        {/* Info Icon SVG */}
                        <svg
                            style={{ width: '16px', height: '16px' }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </button>
                    
                    {/* Chain Selector as blue button dropdown */}
                    <div className="chain-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                            onClick={() => {
                                setShowChainDropdown(!showChainDropdown);
                                setShowWalletDropdown(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setShowChainDropdown(!showChainDropdown);
                                } else if (e.key === 'Escape') {
                                    setShowChainDropdown(false);
                                }
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                backgroundColor: themeColors.primaryColor,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 500,
                                height: '32px',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = themeColors.primaryHover;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = themeColors.primaryColor;
                            }}
                        >
                            {isLoadingChainSwitch ? (
                                <>
                                    <svg 
                                        style={{ 
                                            width: '14px', 
                                            height: '14px', 
                                            animation: 'spin 1s linear infinite' 
                                        }} 
                                        fill="none" 
                                        viewBox="0 0 24 24"
                                    >
                                        <circle 
                                            style={{ opacity: 0.25 }} 
                                            cx="12" 
                                            cy="12" 
                                            r="10" 
                                            stroke="currentColor" 
                                            strokeWidth="4"
                                        />
                                        <path 
                                            style={{ opacity: 0.75 }} 
                                            fill="currentColor" 
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    <span>Switching...</span>
                                </>
                            ) : (
                                <span>{networkInfo.blockchain} {networkInfo.network}</span>
                            )}
                            <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        {/* Dropdown menu with animation */}
                        <div style={{
                            visibility: showChainDropdown ? 'visible' : 'hidden',
                            opacity: showChainDropdown ? 1 : 0,
                            transform: showChainDropdown ? 'translateY(0)' : 'translateY(-10px)',
                            transition: 'all 0.2s ease',
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '4px',
                            backgroundColor: 'white',
                            border: `1px solid ${themeColors.borderColor}`,
                            borderRadius: '6px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            zIndex: 1000,
                            minWidth: '160px'
                        }}>
                            <button
                                onClick={async () => {
                                    setIsLoadingChainSwitch(true);
                                    setShowChainDropdown(false);
                                    await handleChainChange('ethereum-local');
                                    setIsLoadingChainSwitch(false);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    textAlign: 'left'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span>⟠</span>
                                <span>Ethereum Local</span>
                            </button>
                            <button
                                onClick={async () => {
                                    setIsLoadingChainSwitch(true);
                                    setShowChainDropdown(false);
                                    await handleChainChange('stellar-local');
                                    setIsLoadingChainSwitch(false);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    textAlign: 'left'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span>✨</span>
                                <span>Stellar Local</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Wallet Connection Button */}
                    {showConnectButton && (
                        walletState.isConnected ? (
                            <button
                                onClick={() => handleDisconnect()}
                                style={{
                                    position: 'relative',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: themeColors.primaryColor,
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    height: '32px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = themeColors.primaryHover;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = themeColors.primaryColor;
                                }}
                            >
                                {/* Wallet Icon */}
                                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span title={walletState.account || ''}>
                                    {walletState.account ? `${walletState.account.slice(0, 6)}...${walletState.account.slice(-4)}` : 'Wallet'}
                                </span>
                                <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                {/* Green dot indicator */}
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: '#10b981',
                                    borderRadius: '50%',
                                    border: '2px solid ' + (isDarkMode ? '#374151' : '#f9fafb'),
                                    animation: 'pulse 2s infinite'
                                }} />
                            </button>
                        ) : (
                            <button
                                onClick={handleConnect}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: themeColors.primaryColor,
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    height: '32px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = themeColors.primaryHover;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = themeColors.primaryColor;
                                }}
                            >
                                {/* Wallet Icon */}
                                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span style={{ color: 'white' }}>Connect Wallet</span>
                            </button>
                        )
                    )}
                </div>

                {/* Wallet Selection Modal */}
                <WalletSelectionModal
                    visible={showWalletModal}
                    onClose={() => setShowWalletModal(false)}
                    selectedChain={selectedChainId}
                    onWalletSelect={handleWalletSelect}
                />

                {/* Info Modal remains the same */}
                {showInfoModal && chainConfigs && selectedChainId && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 2147483647
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '24px',
                            width: '600px',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            position: 'relative',
                            zIndex: 2147483647
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px'
                            }}>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                                    Blockchain Information
                                </h2>
                                <button
                                    onClick={() => setShowInfoModal(false)}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        color: '#6b7280'
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            {/* Tab Navigation */}
                            <div style={{
                                display: 'flex',
                                borderBottom: '2px solid #e5e7eb',
                                marginBottom: '20px'
                            }}>
                                <button
                                    onClick={() => setActiveModalTab('info')}
                                    style={{
                                        padding: '8px 16px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: activeModalTab === 'info' ? 600 : 400,
                                        color: activeModalTab === 'info' ? '#111827' : '#6b7280',
                                        borderBottom: activeModalTab === 'info' ? '2px solid #3b82f6' : '2px solid transparent',
                                        marginBottom: '-2px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Chain Info
                                </button>
                                <button
                                    onClick={() => setActiveModalTab('loupe')}
                                    style={{
                                        padding: '8px 16px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: activeModalTab === 'loupe' ? 600 : 400,
                                        color: activeModalTab === 'loupe' ? '#111827' : '#6b7280',
                                        borderBottom: activeModalTab === 'loupe' ? '2px solid #3b82f6' : '2px solid transparent',
                                        marginBottom: '-2px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Diamond Loupe
                                </button>
                            </div>

                            {/* Tab Content */}
                            {activeModalTab === 'info' ? (
                                chainConfigs && chainConfigs[selectedChainId] ? (
                                    <ChainInfoTab
                                        chainConfig={chainConfigs[selectedChainId]}
                                        isDev={isDev}
                                        React={React}
                                    />
                                ) : (
                                    <div style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        color: '#6b7280'
                                    }}>
                                        Loading chain configuration...
                                    </div>
                                )
                            ) : (
                                <DiamondLoupeTab
                                    diamondLoupeInfo={diamondLoupeInfo}
                                    loadingLoupe={loadingLoupe}
                                    React={React}
                                />
                            )}
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Regular (non-compact) mode rendering
    return (
        <>
            <div className={className} style={defaultStyles.container}>
                {/* Chain Selector Section */}
                <div style={defaultStyles.section}>
                    <div>
                        <div style={defaultStyles.label}>Blockchain</div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <ChainSelector
                                selectedChainId={selectedChainId}
                                onChainChange={handleChainChange}
                                disabled={false}
                                className=""
                            />
                            {/* Info Button */}
                            <button
                                onClick={async () => {
                                    setShowInfoModal(true);
                                    setActiveModalTab('info');
                                    setDiamondLoupeInfo(null);
                                    // Reload chain configs if not loaded
                                    if (!chainConfigs) {
                                        try {
                                            const { ChainConfigService } = await import('@nomyx/shared');
                                            const configService = new ChainConfigService();
                                            const chains = await configService.getAllChains();
                                            if (chains && Object.keys(chains).length > 0) {
                                                // Convert ChainContractConfig to ChainConfigs format
                                                const convertedConfigs: ChainConfigs = {};
                                                for (const [chainId, chainInfo] of Object.entries(chains)) {
                                                    // Determine chain type from chainId
                                                    const type = chainId.startsWith('stellar') ? 'stellar' : 'ethereum';
                                                    convertedConfigs[chainId] = {
                                                        ...chainInfo, // Spread first to include all properties
                                                        type, // Then override with the type
                                                    };
                                                }
                                                console.log('[BlockchainSelectionManager] Reloaded chain configs from service:', convertedConfigs);
                                                setChainConfigs(convertedConfigs);
                                            }
                                        } catch (error) {
                                            console.error('[BlockchainSelectionManager] Failed to reload chain configs:', error);
                                        }
                                    }
                                    loadDiamondLoupeInfo();
                                }}
                                style={{
                                    padding: '7px',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '38px',
                                    height: '38px',
                                    fontSize: '16px',
                                    transition: 'all 0.2s ease',
                                    marginTop: '0'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#3b82f6';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                                title="Chain Information"
                            >
                                <InfoCircle size="16" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                {showNetworkInfo && showConnectButton && (
                    <div style={defaultStyles.divider} />
                )}

                {/* Network Info Section */}
                {showNetworkInfo && (
                    <div style={defaultStyles.section}>
                        <div style={defaultStyles.networkInfo}>
                            <div style={defaultStyles.label}>Active Network</div>
                            <div style={defaultStyles.value}>
                                {networkInfo.blockchain} {networkInfo.network}
                            </div>
                        </div>
                    </div>
                )}

                {/* Connect Button Section */}
                {showConnectButton && (
                    <>
                        {showNetworkInfo && <div style={defaultStyles.divider} />}
                        <div style={defaultStyles.section}>
                            <ConnectButton
                                selectedChain={selectedChainId}
                                isConnected={walletState.isConnected}
                                isConnecting={walletState.isConnecting}
                                account={walletState.account}
                                onConnect={handleConnect}
                                onDisconnect={handleDisconnect}
                                className=""
                            />
                        </div>
                    </>
                )}

                {/* Logout Button Section */}
                {showLogoutButton && onLogout && (
                    <>
                        <div style={defaultStyles.divider} />
                        <div style={defaultStyles.section}>
                            <button
                                style={defaultStyles.logoutButton}
                                onClick={onLogout}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#b91c1c';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#dc2626';
                                }}
                            >
                                <svg 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                >
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                Logout
                            </button>
                        </div>
                    </>
                )}

                {/* Error display */}
                {walletState.error && (
                    <div style={defaultStyles.errorMessage}>
                        {walletState.error.message}
                    </div>
                )}
            </div>

            {/* Wallet Selection Modal */}
            <WalletSelectionModal
                visible={showWalletModal}
                onClose={() => setShowWalletModal(false)}
                selectedChain={selectedChainId}
                onWalletSelect={handleWalletSelect}
            />

            {/* Info Modal */}
            {showInfoModal && chainConfigs && selectedChainId && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2147483647
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        width: '600px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        position: 'relative',
                        zIndex: 2147483647
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                                Blockchain Information
                            </h2>
                            <button
                                onClick={() => setShowInfoModal(false)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#6b7280'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div style={{
                            display: 'flex',
                            borderBottom: '2px solid #e5e7eb',
                            marginBottom: '20px'
                        }}>
                            <button
                                onClick={() => setActiveModalTab('info')}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: activeModalTab === 'info' ? 600 : 400,
                                    color: activeModalTab === 'info' ? '#111827' : '#6b7280',
                                    borderBottom: activeModalTab === 'info' ? '2px solid #3b82f6' : '2px solid transparent',
                                    marginBottom: '-2px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Chain Info
                            </button>
                            <button
                                onClick={() => setActiveModalTab('loupe')}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: activeModalTab === 'loupe' ? 600 : 400,
                                    color: activeModalTab === 'loupe' ? '#111827' : '#6b7280',
                                    borderBottom: activeModalTab === 'loupe' ? '2px solid #3b82f6' : '2px solid transparent',
                                    marginBottom: '-2px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Diamond Loupe
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeModalTab === 'info' ? (
                            chainConfigs && chainConfigs[selectedChainId] ? (
                                <ChainInfoTab
                                    chainConfig={chainConfigs[selectedChainId]}
                                    isDev={isDev}
                                    React={React}
                                />
                            ) : (
                                <div style={{
                                    padding: '40px',
                                    textAlign: 'center',
                                    color: '#6b7280'
                                }}>
                                    Loading chain configuration...
                                </div>
                            )
                        ) : (
                            <DiamondLoupeTab
                                diamondLoupeInfo={diamondLoupeInfo}
                                loadingLoupe={loadingLoupe}
                                React={React}
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    );
};