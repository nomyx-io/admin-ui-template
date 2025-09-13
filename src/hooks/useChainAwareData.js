import { useState, useEffect, useCallback } from 'react';
import { BlockchainServiceManager } from '@nomyx/shared';

/**
 * Custom hook for chain-aware data fetching
 * Automatically refreshes data when the blockchain chain changes
 *
 * @param {Object} service - The blockchain service instance
 * @param {Function} fetchDataFn - Function that fetches the data (receives service as parameter)
 * @param {Array} dependencies - Additional dependencies for the fetch function
 * @returns {Object} { data, loading, error, refetch, currentChain }
 */
export const useChainAwareData = (service, fetchDataFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentChain, setCurrentChain] = useState(null);

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!service) {
      console.log('[useChainAwareData] Service not ready yet, waiting...');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current chain ID (string) instead of chain object
      // The getCurrentChain method returns ChainInfo synchronously
      const chain = service.getCurrentChain ? service.getCurrentChain() : null;
      // Ensure we extract a string ID from the chain object
      let chainId = 'ethereum-local';
      if (typeof chain === 'string') {
        chainId = chain;
      } else if (chain && typeof chain === 'object') {
        chainId = chain.chainKey || chain.id || chain.chainId || 'ethereum-local';
      }
      setCurrentChain(chainId);
      console.log(`[useChainAwareData] Fetching data for chain: ${chainId}`);
      
      // Fetch the data
      const result = await fetchDataFn(service);
      setData(result);
    } catch (err) {
      console.error('[useChainAwareData] Error fetching data:', err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [service, fetchDataFn, ...dependencies]);

  // Initial load and when service changes
  useEffect(() => {
    fetchData();
  }, [service, ...dependencies]);

  // Monitor for chain changes using event system
  useEffect(() => {
    if (!service) return;

    // Get the BlockchainServiceManager singleton instance
    const manager = BlockchainServiceManager.getInstance();

    const handleChainChange = (data) => {
      // The event data contains the new chainId
      const newChainId = data?.chainId;

      if (newChainId && newChainId !== currentChain && currentChain !== null) {
        console.log(`[useChainAwareData] Chain changed from ${currentChain} to ${newChainId}, refreshing data...`);
        // Update the current chain and fetch new data
        setCurrentChain(newChainId);
        fetchData();
      }
    };

    // Subscribe to chain change events
    manager.on('chain:changed', handleChainChange);
    console.log('[useChainAwareData] Subscribed to chain:changed events');

    // Cleanup function to remove the event listener
    return () => {
      manager.off('chain:changed', handleChainChange);
      console.log('[useChainAwareData] Unsubscribed from chain:changed events');
    };
  }, [currentChain, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    currentChain
  };
};

export default useChainAwareData;