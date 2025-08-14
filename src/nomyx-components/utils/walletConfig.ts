import { WalletInfo, WalletProvider } from '../types';

// Extended wallet info with icon property for UI display
export interface ExtendedWalletInfo extends WalletInfo {
    icon?: string;
    recommended?: boolean;
}

export const WALLET_CONFIGS: ExtendedWalletInfo[] = [
    // Dev Wallet (for local/testnet)
    {
        id: WalletProvider.DEV,
        name: 'Dev Wallet',
        logo: '/images/wallets/dev.svg',
        icon: '🔧',
        blockchain: 'ethereum',
        downloadUrl: '',
        supportedChains: ['ethereum-local', 'ethereum-sepolia', 'stellar-testnet', 'stellar-local']
    },
    
    // Ethereum Wallets
    {
        id: WalletProvider.METAMASK,
        name: 'MetaMask',
        logo: '/images/wallets/metamask.svg',
        icon: '🦊',
        blockchain: 'ethereum',
        downloadUrl: 'https://metamask.io/download/',
        supportedChains: ['ethereum-local', 'ethereum-sepolia', 'ethereum-mainnet'],
        recommended: true
    },
    {
        id: WalletProvider.WALLETCONNECT,
        name: 'WalletConnect',
        logo: '/images/wallets/walletconnect.svg',
        icon: '🔗',
        blockchain: 'ethereum',
        downloadUrl: 'https://walletconnect.org/',
        supportedChains: ['ethereum-local', 'ethereum-sepolia', 'ethereum-mainnet']
    },
    
    // Stellar Wallets
    {
        id: WalletProvider.FREIGHTER,
        name: 'Freighter',
        logo: '/images/wallets/freighter.svg',
        icon: '🚀',
        blockchain: 'stellar',
        downloadUrl: 'https://www.freighter.app/',
        supportedChains: ['stellar-testnet', 'stellar-mainnet', 'stellar-local'],
        recommended: true
    }
];

export const getWalletsForChain = (chainId: string): ExtendedWalletInfo[] => {
    const blockchainType = chainId.split('-')[0] as 'ethereum' | 'stellar';
    const isDevOrTestnet = chainId.includes('-local') || chainId.includes('-testnet');
    
    // Filter wallets that support this chain
    let wallets = WALLET_CONFIGS.filter(wallet => {
        // Dev wallet should work for any dev/testnet chain regardless of blockchain type
        if (wallet.id === WalletProvider.DEV && isDevOrTestnet) {
            return true;
        }
        // For non-dev wallets, check blockchain type and supported chains
        return wallet.blockchain === blockchainType && wallet.supportedChains.includes(chainId);
    });
    
    // Sort to put dev wallet first for dev/testnet chains
    if (isDevOrTestnet) {
        wallets = wallets.sort((a, b) => {
            if (a.id === WalletProvider.DEV) return -1;
            if (b.id === WalletProvider.DEV) return 1;
            return 0;
        });

        // the dev wallet uses "ethereum" statically as defined above, so we need to override it to use the correct blockchain type
        wallets[0].blockchain = blockchainType;
    }
    
    return wallets;
};

export const getWalletInfo = (provider: WalletProvider): ExtendedWalletInfo | undefined => {
    return WALLET_CONFIGS.find(wallet => wallet.id === provider);
};