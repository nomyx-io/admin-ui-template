import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  WalletProviderFactory, 
  IWalletProvider, 
  WalletChainType, 
  WalletStatus,
  WalletProviderType 
} from '@nomyx/shared';
import { toast } from 'react-toastify';

interface UniversalWalletContextType {
  // Chain management
  selectedChain: string;
  setSelectedChain: (chain: string) => void;
  
  // Wallet state
  isConnected: boolean;
  isConnecting: boolean;
  account: string;
  network: string;
  walletProvider: string;
  
  // Wallet actions
  connect: () => void;
  disconnect: () => Promise<void>;
  
  // Modal state
  showWalletModal: boolean;
  setShowWalletModal: (show: boolean) => void;
  
  // Current wallet provider
  currentProvider: IWalletProvider | null;
}

const UniversalWalletContext = createContext<UniversalWalletContextType>({
  selectedChain: 'ethereum-local',
  setSelectedChain: () => {},
  isConnected: false,
  isConnecting: false,
  account: '',
  network: '',
  walletProvider: '',
  connect: () => {},
  disconnect: async () => {},
  showWalletModal: false,
  setShowWalletModal: () => {},
  currentProvider: null,
});

export const UniversalWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedChain, setSelectedChain] = useState<string>(() => {
    // Load from localStorage or default
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nomyx-selected-chain') || 'ethereum-local';
    }
    return 'ethereum-local';
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState('');
  const [network, setNetwork] = useState('');
  const [walletProvider, setWalletProvider] = useState(() => {
    // Load last used wallet provider from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nomyx-wallet-provider') || '';
    }
    return '';
  });
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<IWalletProvider | null>(null);

  // Save chain selection to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nomyx-selected-chain', selectedChain);
      console.log(`[UniversalWallet] Saved chain selection: ${selectedChain}`);
    }
  }, [selectedChain]);

  // Auto-reconnect to wallet on load
  useEffect(() => {
    const autoReconnect = async () => {
      if (typeof window === 'undefined') return;
      
      const savedProvider = localStorage.getItem('nomyx-wallet-provider');
      const savedAccount = localStorage.getItem('nomyx-wallet-account');
      const savedChain = localStorage.getItem('nomyx-selected-chain');
      
      if (savedProvider && savedAccount && !isConnected && !isConnecting) {
        console.log(`[UniversalWallet] Attempting auto-reconnect to ${savedProvider}`);
        
        // For now, just log that we would auto-reconnect
        // The actual reconnect happens when user clicks connect
        // This preserves the saved provider name for display
        console.log(`[UniversalWallet] Last used wallet: ${savedProvider} on chain: ${savedChain}`);
      }
    };

    // Delay auto-reconnect slightly to let the app initialize
    const timer = setTimeout(autoReconnect, 500);
    return () => clearTimeout(timer);
  }, []); // Run only on mount

  // Connect wallet
  const connect = useCallback(() => {
    setShowWalletModal(true);
  }, []);

  // Handle wallet selection from modal
  const handleWalletSelect = useCallback(async (provider: IWalletProvider) => {
    setIsConnecting(true);
    setShowWalletModal(false);

    try {
      // Check if wallet is available
      const status = await provider.getStatus();
      if (status !== WalletStatus.AVAILABLE && status !== WalletStatus.CONNECTED) {
        if (status === WalletStatus.NOT_INSTALLED) {
          toast.error(`${provider.metadata.name} is not installed`);
        } else if (status === WalletStatus.WRONG_CHAIN) {
          toast.error(`${provider.metadata.name} does not support this chain`);
        } else {
          toast.error(`${provider.metadata.name} is not available`);
        }
        setIsConnecting(false);
        return;
      }

      // Determine chain type from selected chain
      const chainType: WalletChainType = selectedChain.includes('stellar') ? 'stellar' : 'ethereum';
      
      // Connect to wallet
      const address = await provider.connect(chainType);
      
      setAccount(address);
      setNetwork(selectedChain);
      setWalletProvider(provider.metadata.name);
      setIsConnected(true);
      setCurrentProvider(provider);
      
      // Save wallet provider to localStorage for auto-reconnect
      if (typeof window !== 'undefined') {
        localStorage.setItem('nomyx-wallet-provider', provider.metadata.name);
        localStorage.setItem('nomyx-wallet-account', address);
        console.log(`[UniversalWallet] Saved wallet provider: ${provider.metadata.name}`);
      }
      
      toast.success(`Connected to ${provider.metadata.name}`);
    } catch (error) {
      console.error('[UniversalWallet] Connection error:', error);
      toast.error(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  }, [selectedChain]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (currentProvider) {
      try {
        await currentProvider.disconnect();
      } catch (error) {
        console.error('[UniversalWallet] Disconnect error:', error);
      }
    }
    
    setIsConnected(false);
    setAccount('');
    setNetwork('');
    setWalletProvider('');
    setCurrentProvider(null);
    
    // Clear wallet from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nomyx-wallet-provider');
      localStorage.removeItem('nomyx-wallet-account');
      console.log('[UniversalWallet] Cleared saved wallet');
    }
    
    toast.info('Wallet disconnected');
  }, [currentProvider]);

  // Handle chain change
  const handleChainChange = useCallback(async (newChain: string) => {
    // If connected, disconnect first
    if (isConnected && currentProvider) {
      await disconnect();
    }
    
    setSelectedChain(newChain);
  }, [isConnected, currentProvider, disconnect]);

  return (
    <UniversalWalletContext.Provider
      value={{
        selectedChain,
        setSelectedChain: handleChainChange,
        isConnected,
        isConnecting,
        account,
        network,
        walletProvider,
        connect,
        disconnect,
        showWalletModal,
        setShowWalletModal,
        currentProvider,
      }}
    >
      {children}
    </UniversalWalletContext.Provider>
  );
};

export const useUniversalWallet = () => {
  const context = useContext(UniversalWalletContext);
  if (!context) {
    throw new Error('useUniversalWallet must be used within UniversalWalletProvider');
  }
  return context;
};