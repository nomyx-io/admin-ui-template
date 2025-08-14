import { useState, useEffect, useCallback } from 'react';

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
      
      // Get current chain
      const chain = await service.getCurrentChain();
      setCurrentChain(chain);
      console.log(`[useChainAwareData] Fetching data for chain: ${chain}`);
      
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

  // Monitor for chain changes
  useEffect(() => {
    if (!service) return;
    
    const checkChainChange = async () => {
      try {
        const chain = await service.getCurrentChain();
        if (chain !== currentChain && currentChain !== null) {
          console.log(`[useChainAwareData] Chain changed from ${currentChain} to ${chain}, refreshing data...`);
          fetchData();
        }
      } catch (error) {
        console.error('[useChainAwareData] Error checking chain change:', error);
      }
    };
    
    // Check for chain changes periodically
    const interval = setInterval(checkChainChange, 1000);
    
    return () => clearInterval(interval);
  }, [service, currentChain, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    currentChain
  };
};

export default useChainAwareData;