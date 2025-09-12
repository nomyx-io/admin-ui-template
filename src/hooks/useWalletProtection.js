import React, { useState, useCallback } from 'react';
import WalletConnectionModal from '../components/WalletConnectionModal';

/**
 * useWalletProtection - Hook to manage wallet connection requirement
 * 
 * This hook provides a modal interface and callback for wallet connection
 * that can be passed to the WalletProtectedService.
 */
export function useWalletProtection() {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletPromiseResolve, setWalletPromiseResolve] = useState(null);
  
  // Callback to trigger wallet connection modal
  const onWalletRequired = useCallback(() => {
    return new Promise((resolve) => {
      console.log('[useWalletProtection] Wallet connection required, showing modal');
      setShowWalletModal(true);
      setWalletPromiseResolve(() => resolve);
    });
  }, []);
  
  // Handle modal close
  const handleModalClose = useCallback((connected) => {
    console.log('[useWalletProtection] Modal closed, connected:', connected);
    setShowWalletModal(false);
    if (walletPromiseResolve) {
      walletPromiseResolve(connected);
      setWalletPromiseResolve(null);
    }
  }, [walletPromiseResolve]);
  
  // Handle successful wallet connection
  const handleWalletConnect = useCallback((walletInfo) => {
    console.log('[useWalletProtection] Wallet connected:', walletInfo);
    // Additional handling if needed
  }, []);
  
  // Modal component to render - return JSX directly
  const WalletModal = (
    <WalletConnectionModal
      visible={showWalletModal}
      onClose={handleModalClose}
      onConnect={handleWalletConnect}
    />
  );
  
  return {
    onWalletRequired,
    WalletModal,
    showWalletModal
  };
}

export default useWalletProtection;