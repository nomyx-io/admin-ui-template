import React, { useContext, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "antd";
import { useRouter } from "next/router";
import ClientBlockchainSelector from "./ClientBlockchainSelector";
import NomyxLogo from "../assets/nomyx_logo_black.svg";
import { BlockchainServiceManager } from "@nomyx/shared";
import "../styles/NavBar.css";

interface NavBarProps {
  onLogout: () => void;
  selectedChainId: string;
  onChainChange: (chainId: string) => void;
  showWalletConnect?: boolean;
}

const NextNavBar: React.FC<NavBarProps> = ({
  onLogout,
  selectedChainId,
  onChainChange,
  showWalletConnect = false
}) => {
  const router = useRouter();
  const manager = BlockchainServiceManager.getInstance();
  const [isWalletConnected, setIsWalletConnected] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState<string>('');

  // Listen to manager events and get initial state
  useEffect(() => {
    const updateState = () => {
      setIsWalletConnected(manager.isWalletConnected());
      const address = manager.getWalletAddress();
      setWalletAddress(address || '');
    };

    // Get initial state
    updateState();

    // Event handlers
    const handleWalletConnectEvent = () => updateState();
    const handleWalletDisconnectEvent = () => updateState();
    const handleChainChangeEvent = () => updateState();

    // Subscribe to events
    manager.on('walletConnected', handleWalletConnectEvent);
    manager.on('walletDisconnected', handleWalletDisconnectEvent);
    manager.on('chainChanged', handleChainChangeEvent);

    // Cleanup
    return () => {
      manager.off('walletConnected', handleWalletConnectEvent);
      manager.off('walletDisconnected', handleWalletDisconnectEvent);
      manager.off('chainChanged', handleChainChangeEvent);
    };
  }, [manager]);

  const handleChainChange = async (chainKey: string) => {
    try {
      onChainChange(chainKey);
      console.log(`[NavBar] Chain switch requested: ${chainKey}`);
    } catch (error) {
      console.error('[NavBar] Error switching chain:', error);
    }
  };

  const handleWalletConnect = (walletType: string, address?: string) => {
    console.log(`[NavBar] Wallet connected: ${walletType} with address ${address}`);
    // State will be updated via the manager events
  };

  const isActive = (path: string) => {
    return router.pathname === path ? 'active' : '';
  };

  return (
    <nav>
      <ul>
        <li>
          <img src={typeof NomyxLogo === 'string' ? NomyxLogo : (NomyxLogo as any).src || NomyxLogo} alt="Nomyx Logo" />
        </li>
        <li>
          <Link href="/dashboard" className={isActive('/dashboard')}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link href="/topics" className={isActive('/topics')}>
            Compliance Rules
          </Link>
        </li>
        <li>
          <Link href="/issuers" className={isActive('/issuers')}>
            Trusted Issuers
          </Link>
        </li>
        <li>
          <Link href="/identities" className={isActive('/identities')}>
            Identities
          </Link>
        </li>
        <li>
          <ClientBlockchainSelector
            selectedChainId={selectedChainId}
            onChainChange={handleChainChange}
            showConnectButton={showWalletConnect}
            showNetworkInfo={true}
            compact={true}
            headerMode={false}
            isConnected={isWalletConnected}
            walletAddress={walletAddress}
            onWalletConnect={handleWalletConnect}
            isLoggedIn={true}
            showUI={true}
          />
          <Button onClick={onLogout}>Logout</Button>
        </li>
      </ul>
    </nav>
  );
};

export default NextNavBar;