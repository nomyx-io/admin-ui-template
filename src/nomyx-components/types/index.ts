// Frontend types for nomyx-ts blockchain selection and wallet management

import { ReactLike } from "./component-types";

export interface ChainOption {
    chainId: string;
    displayName: string;
    blockchainType: 'ethereum' | 'stellar';
    networkName: string;
    hasAllContracts: boolean;
    errors: string[];
    rpcUrl?: string;
    explorerUrl?: string;
    nativeCurrency?: {
        name: string;
        symbol: string;
        decimals: number;
    };
}

export interface WalletInfo {
    id: string;
    name: string;
    logo: string;
    blockchain: 'ethereum' | 'stellar';
    downloadUrl: string;
    supportedChains: string[];
}

export enum WalletProvider {
    METAMASK = 'metamask',
    WALLETCONNECT = 'walletconnect',
    FREIGHTER = 'freighter',
    ALBEDO = 'albedo',
    XBULL = 'xbull',
    DEV = 'dev',
    DFNS = 'dfns',
}

export interface WalletConnectionState {
    isConnected: boolean;
    isConnecting: boolean;
    account: string | null;
    chainId: string | null;
    walletProvider: WalletProvider | null;
    error: Error | null;
}

export interface BlockchainSelectionManagerProps {
    selectedChainId: string;
    onChainChange: (chainId: string) => void;
    onWalletConnect?: (account: string, provider: WalletProvider) => void;
    onWalletDisconnect?: () => void;
    onLogout?: () => void;
    className?: string;
    showNetworkInfo?: boolean;
    showConnectButton?: boolean;
    showLogoutButton?: boolean;
    headerMode?: boolean;
    compact?: boolean;  // Compact mode like admin portal
    darkMode?: boolean; // Override dark mode detection
}

export interface WalletSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    selectedChain: string;
    onWalletSelect: (provider: WalletProvider) => void;
    onSelect?: (provider: WalletProvider) => void;
    chainType?: string;
    service?: any;
    chainId?: string;
    isDark?: boolean;
    onNavigate?: () => void;
    authMode?: string;
}

export interface ChainSelectorProps {
    selectedChainId: string;
    onChainChange: (chainId: string) => void;
    currentChain?: string;
    disabled?: boolean;
    className?: string;
    headerMode?: boolean;
    availableChains?: string[];
    isDark?: boolean;
    isLoading?: boolean;
}

export interface ConnectButtonProps {
    selectedChain: string;
    isConnected: boolean;
    isConnecting: boolean;
    account: string | null;
    onConnect: () => void;
    onDisconnect: () => void;
    className?: string;
    headerMode?: boolean;
}