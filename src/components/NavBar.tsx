import React, { useContext } from "react";
import Link from "next/link";
import { Button } from "antd";
import { BlockchainSelectionManager } from "../nomyx-components/BlockchainSelectionManager";
import NomyxLogo from "../assets/nomyx_logo_black.svg";
import { RoleContext } from "../context/RoleContext";
import { useUniversalWallet } from "../context/UniversalWalletContext";
import { WalletPreference } from "../utils/Constants";


interface NavBarProps {
  onConnect: () => void;
  onDisconnect: () => void;
  onLogout: () => void;
  role: string[];
  selectedChainId: string;
  onChainChange: (chainId: string) => void;
}

const NavBar: React.FC<NavBarProps> = ({
  onConnect,
  onDisconnect,
  onLogout,
  role,
  selectedChainId,
  onChainChange
}) => {
  const { walletPreference } = useContext(RoleContext);
  const {
    selectedChain,
    setSelectedChain,
    connect,
    disconnect,
    isConnected,
    account,
    walletProvider
  } = useUniversalWallet();

  // Handle logout
  const handleLogout = () => {
    onLogout();
  };

  const handleChainChange = async (chainKey: string) => {
    try {
      // Update the unified wallet context
      setSelectedChain(chainKey);

      // Call parent handler which will handle BlockchainService initialization
      onChainChange(chainKey);

      console.log(`[NavBar] Chain switch requested: ${chainKey}`);
    } catch (error) {
      console.error('[NavBar] Error switching chain:', error);
    }
  };


  return (
    <nav className="bg-white text-black p-6">
      <ul className="flex space-x-6 items-center">
        {role.includes("CentralAuthority") && (
          <>
            <li style={{ padding: "20px 20px", minWidth: "100px" }}>
              <img src={NomyxLogo} alt="Nomyx Logo" className="h-8 w-auto" />
            </li>
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li>
              <span>
                <a
                  href={process.env.REACT_APP_MINTIFY_UI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center"
                >
                  Mint
                  <span className="text-[#7F56D9]">↗</span>
                </a>
              </span>
            </li>
            <li>
              <Link href="/topics" className="hover:underline">
                Compliance Rules
              </Link>
            </li>
            <li>
              <Link href="/issuers" className="hover:underline">
                Trusted Issuers
              </Link>
            </li>
            <li>
              <Link href="/identities" className="hover:underline">
                Identities
              </Link>
            </li>
          </>
        )}
        {role.includes("TrustedIssuer") && !role.includes("CentralAuthority") && (
          <li>
            <Link href="/identities" className="hover:underline">
              Identities
            </Link>
          </li>
        )}

        {/* Blockchain Selection and Wallet - positioned after navigation items */}
        <li style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <BlockchainSelectionManager
            compact={true}
            selectedChainId={selectedChain}
            onChainChange={(chainId: string) => {
              setSelectedChain(chainId);
              onChainChange(chainId);
            }}
            onWalletConnect={(address: string, provider: any) => {
              // This is handled by the universal wallet context
              console.log(`[NavBar] Wallet connected: ${address} via ${provider}`);
            }}
            onWalletDisconnect={() => {
              disconnect();
            }}
            showConnectButton={true}
            showNetworkInfo={false}
            showLogoutButton={false}
          />

          {/* Logout Button */}
          <Button onClick={handleLogout} className="bg-red-500 text-white">
            Logout
          </Button>
        </li>
      </ul>
    </nav>
  );
};

export default NavBar;