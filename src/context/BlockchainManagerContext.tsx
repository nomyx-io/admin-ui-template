import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import BlockchainService from '../services/BlockchainService';

/**
 * BlockchainManager Context - Provides wallet and blockchain state to all components
 * 
 * This context provides:
 * - Wallet connection state (DEV, MetaMask, Freighter, DFNS)
 * - Chain selection and switching
 * - Transaction signing (unified async interface)
 * - Blockchain service instance
 */

interface BlockchainManagerContextValue {
  // Wallet state
  isConnected: boolean;
  account: string | null;
  walletProvider: string | null;
  
  // Wallet operations (all async for DFNS compatibility)
  signTransaction: (tx: any) => Promise<any>;
  signMessage: (message: string) => Promise<string>;
  getWalletType: () => 'private' | 'managed' | null;
  
  // Chain state
  selectedChain: string;
  setSelectedChain: (chainId: string) => void;
  
  // Service instance
  service: BlockchainService | null;
  
  // Connection management
  connectWallet: (provider: string, chainId: string) => Promise<void>;
  disconnectWallet: () => void;
}

const BlockchainManagerContext = createContext<BlockchainManagerContextValue | undefined>(undefined);

export const useBlockchainManager = () => {
  const context = useContext(BlockchainManagerContext);
  if (!context) {
    // Return a mock context when not wrapped by provider
    // This prevents errors but components won't have real wallet access
    console.warn('[BlockchainManagerContext] Component is not wrapped by BlockchainManagerProvider. Returning mock context.');
    return {
      isConnected: false,
      account: null,
      walletProvider: null,
      signTransaction: async () => { throw new Error('Not connected'); },
      signMessage: async () => { throw new Error('Not connected'); },
      getWalletType: () => null,
      selectedChain: 'ethereum-local',
      setSelectedChain: () => {},
      service: null,
      connectWallet: async () => {},
      disconnectWallet: () => {},
    };
  }
  return context;
};

interface BlockchainManagerProviderProps {
  children: React.ReactNode;
}

export const BlockchainManagerProvider: React.FC<BlockchainManagerProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState('ethereum-local');
  const [service, setService] = useState<BlockchainService | null>(null);

  // Initialize blockchain service
  useEffect(() => {
    const initService = async () => {
      try {
        const savedChain = localStorage.getItem('nomyx-selected-chain') || 'ethereum-local';
        setSelectedChain(savedChain);
        
        const blockchainService = new BlockchainService();
        await blockchainService.initialize(savedChain);
        setService(blockchainService);
        
        // Check for saved wallet connection
        const savedConnections = localStorage.getItem('nomyx-wallet-connections');
        if (savedConnections) {
          const connections = JSON.parse(savedConnections);
          const chainConnection = connections[savedChain];
          if (chainConnection) {
            setAccount(chainConnection.account);
            setWalletProvider(chainConnection.provider);
            setIsConnected(true);
            console.log('[BlockchainManagerProvider] Restored wallet connection:', chainConnection);
          }
        }
      } catch (error) {
        console.error('[BlockchainManagerProvider] Failed to initialize service:', error);
      }
    };
    
    initService();
  }, []);

  // Handle chain changes
  useEffect(() => {
    const handleChainChange = async () => {
      if (service) {
        try {
          await service.initialize(selectedChain);
          console.log('[BlockchainManagerProvider] Chain switched to:', selectedChain);
          
          // Check for saved connection on new chain
          const savedConnections = localStorage.getItem('nomyx-wallet-connections');
          if (savedConnections) {
            const connections = JSON.parse(savedConnections);
            const chainConnection = connections[selectedChain];
            if (chainConnection) {
              setAccount(chainConnection.account);
              setWalletProvider(chainConnection.provider);
              setIsConnected(true);
            } else {
              // No saved connection for this chain
              setIsConnected(false);
              setAccount(null);
              setWalletProvider(null);
            }
          }
        } catch (error) {
          console.error('[BlockchainManagerProvider] Failed to switch chain:', error);
        }
      }
    };
    
    handleChainChange();
  }, [selectedChain]);

  const connectWallet = useCallback(async (provider: string, chainId: string) => {
    try {
      // For DEV wallet, just set the account
      if (provider === 'dev') {
        const devAccount = chainId.includes('stellar') 
          ? 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI'
          : '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        
        setAccount(devAccount);
        setWalletProvider('dev');
        setIsConnected(true);
        
        // Save connection
        const savedConnections = JSON.parse(localStorage.getItem('nomyx-wallet-connections') || '{}');
        savedConnections[chainId] = { account: devAccount, provider: 'dev' };
        localStorage.setItem('nomyx-wallet-connections', JSON.stringify(savedConnections));
        
        console.log('[BlockchainManagerProvider] Connected DEV wallet:', devAccount);
      }
      // Add other wallet provider logic here (MetaMask, Freighter, etc.)
    } catch (error) {
      console.error('[BlockchainManagerProvider] Failed to connect wallet:', error);
      throw error;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setWalletProvider(null);
    
    // Remove saved connection for current chain
    const savedConnections = JSON.parse(localStorage.getItem('nomyx-wallet-connections') || '{}');
    delete savedConnections[selectedChain];
    localStorage.setItem('nomyx-wallet-connections', JSON.stringify(savedConnections));
    
    console.log('[BlockchainManagerProvider] Wallet disconnected');
  }, [selectedChain]);

  const getWalletType = useCallback(() => {
    if (!isConnected || !walletProvider) return null;
    
    // DFNS is managed, all others are private
    if (walletProvider === 'dfns') return 'managed';
    return 'private';
  }, [isConnected, walletProvider]);

  const signTransaction = useCallback(async (tx: any) => {
    if (!isConnected) throw new Error('Wallet not connected');
    
    // For DEV wallet, transactions are signed automatically by the service
    if (walletProvider === 'dev') {
      console.log('[BlockchainManagerProvider] DEV wallet auto-signing transaction');
      return tx;
    }
    
    // Add other wallet signing logic here
    throw new Error(`Transaction signing not implemented for ${walletProvider}`);
  }, [isConnected, walletProvider]);

  const signMessage = useCallback(async (message: string) => {
    if (!isConnected) throw new Error('Wallet not connected');
    
    // For DEV wallet, return a mock signature
    if (walletProvider === 'dev') {
      console.log('[BlockchainManagerProvider] DEV wallet mock-signing message');
      return `dev-signature-${message}`;
    }
    
    // Add other wallet signing logic here
    throw new Error(`Message signing not implemented for ${walletProvider}`);
  }, [isConnected, walletProvider]);

  const value: BlockchainManagerContextValue = {
    isConnected,
    account,
    walletProvider,
    signTransaction,
    signMessage,
    getWalletType,
    selectedChain,
    setSelectedChain,
    service,
    connectWallet,
    disconnectWallet,
  };

  return (
    <BlockchainManagerContext.Provider value={value}>
      {children}
    </BlockchainManagerContext.Provider>
  );
};

export default BlockchainManagerProvider;