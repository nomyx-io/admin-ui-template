import { useEffect, useState } from 'react';
import { BlockchainServiceManager, UnifiedBlockchainService } from '@nomyx/shared';

/**
 * CRITICAL: SINGLE SOURCE OF TRUTH REQUIREMENT
 * ============================================
 * This hook MUST use BlockchainServiceManager.getInstance() as the single source of truth.
 * 
 * DO NOT:
 * - Create new instances with createBlockchainService() 
 * - Bypass BlockchainServiceManager
 * - Create separate blockchain service instances
 * 
 * WHY THIS MATTERS:
 * - Ensures wallet connections are consistent within the portal
 * - Maintains chain selection state across all components
 * - Prevents state desynchronization in the 5-part workflow
 * - Guarantees all components use the same blockchain adapter instance
 * 
 * The 5-part workflow (Admin -> Mintify -> Customer -> Mintify -> Customer) 
 * requires consistent blockchain state management within each portal.
 * 
 * @see BlockchainServiceManager in @nomyx/shared
 */

/**
 * Hook to access the blockchain service from the singleton manager
 * Returns the service and loading state
 * 
 * IMPORTANT: This is the ONLY way components should access blockchain services
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
        
        const blockchainService = await manager.getBlockchainService();
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
    const handleChainChange = async (data: any) => {
      setSelectedChain(data.chainId);
      const service = await manager.getBlockchainService();
      setService(service);
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