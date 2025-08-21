import { useEffect, useState } from 'react';
import { BlockchainServiceManager, UnifiedBlockchainService } from '@nomyx/shared';

/**
 * Hook to access the blockchain service from the singleton manager
 * Returns the service and loading state
 */
export function useBlockchainService() {
  const [service, setService] = useState<UnifiedBlockchainService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>('');

  useEffect(() => {
    const initService = async () => {
      try {
        const manager = BlockchainServiceManager.getInstance();
        
        // Initialize if not already done
        if (!manager.isServiceInitialized()) {
          const defaultChain = localStorage.getItem('nomyx-selected-chain') || 'ethereum-local';
          await manager.initialize(defaultChain);
        }
        
        const blockchainService = manager.getBlockchainService();
        const currentChain = manager.getCurrentChainId() || '';
        
        setService(blockchainService);
        setSelectedChain(currentChain);
        setError(null);
      } catch (err) {
        console.error('[useBlockchainService] Failed to get service:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize blockchain service');
      } finally {
        setLoading(false);
      }
    };

    initService();

    // Subscribe to chain changes
    const manager = BlockchainServiceManager.getInstance();
    const handleChainChange = (data: any) => {
      setSelectedChain(data.chainId);
      setService(manager.getBlockchainService());
    };

    manager.on('chain:changed', handleChainChange);

    return () => {
      manager.off('chain:changed', handleChainChange);
    };
  }, []);

  return {
    blockchainService: service,
    loading,
    error,
    selectedChain
  };
}