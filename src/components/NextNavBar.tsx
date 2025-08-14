import React, { useContext } from "react";
import Link from "next/link";
import { Button } from "antd";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import NomyxLogo from "../assets/nomyx_logo_black.svg";
import "../styles/NavBar.css";

// Dynamically import BlockchainSelectionManager to avoid SSR issues
const BlockchainSelectionManager = dynamic(
  () => import("@nomyx/shared").then(mod => mod.BlockchainSelectionManager),
  { 
    ssr: false,
    loading: () => (
      <select 
        disabled
        style={{ 
          marginRight: '10px', 
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #d9d9d9'
        }}
      >
        <option>Loading...</option>
      </select>
    )
  }
);

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
  
  const handleChainChange = async (chainKey: string) => {
    try {
      onChainChange(chainKey);
      console.log(`[NavBar] Chain switch requested: ${chainKey}`);
    } catch (error) {
      console.error('[NavBar] Error switching chain:', error);
    }
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
          <Link href="/mint" className={isActive('/mint')}>
            Mint
          </Link>
        </li>
        <li>
          <BlockchainSelectionManager
            selectedChainId={selectedChainId}
            onChainChange={handleChainChange}
            showConnectButton={showWalletConnect}
            showNetworkInfo={true}
            compact={true}
            headerMode={false}
          />
          <Button onClick={onLogout}>Logout</Button>
        </li>
      </ul>
    </nav>
  );
};

export default NextNavBar;