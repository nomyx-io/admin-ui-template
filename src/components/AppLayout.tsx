import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Spin } from "antd";
import dynamic from "next/dynamic";

const NextNavBar = dynamic(() => import("./NextNavBar"), { 
  ssr: false,
  loading: () => <div style={{ height: 60 }} /> 
}) as React.ComponentType<any>;

interface AppLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AppLayout({ children, requireAuth = true }: AppLayoutProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState("ethereum-local");

  useEffect(() => {
    if (!requireAuth) {
      setLoading(false);
      return;
    }

    // Check if user is authenticated - check multiple possible token keys
    const sessionToken = localStorage.getItem("nomyx-session-token") ||
                        localStorage.getItem("sessionToken") ||
                        localStorage.getItem("access_token");
    const tokenExpiration = localStorage.getItem("tokenExpiration");

    if (!sessionToken || !tokenExpiration) {
      router.push("/login");
      return;
    }

    // Check if token is expired
    const expirationTime = parseInt(tokenExpiration);
    if (Date.now() > expirationTime) {
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("tokenExpiration");
      localStorage.removeItem("user");
      router.push("/login");
      return;
    }

    setIsAuthenticated(true);
    setLoading(false);

    // Get saved chain preference
    const savedChain = localStorage.getItem("nomyx-selected-chain");
    if (savedChain) {
      setSelectedChain(savedChain);
    }
  }, [router, requireAuth]);

  const handleLogout = async () => {
    // Use centralized logout handling from BlockchainServiceManager
    // This clears: session tokens, DFNS token, user info, and stops session validation
    const { BlockchainServiceManager } = await import('@nomyx/shared');
    const manager = BlockchainServiceManager.getInstance();
    manager.handleLogout();

    // Also clear any legacy/portal-specific tokens
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("tokenExpiration");
    localStorage.removeItem("user");

    console.log("[Admin Logout] Logout complete, redirecting to login");
    router.push("/login");
  };

  const handleChainChange = async (chainId: string) => {
    setSelectedChain(chainId);
    localStorage.setItem("nomyx-selected-chain", chainId);
    
    // Switch chain using BlockchainServiceManager without reloading
    try {
      const { BlockchainServiceManager } = await import('@nomyx/shared');
      const manager = BlockchainServiceManager.getInstance();
      await manager.switchChain(chainId);
      
      // Chain switch event will be handled by components using useBlockchainService hook
      console.log(`[AppLayout] Switched to chain: ${chainId}`);
    } catch (error) {
      console.error('[AppLayout] Failed to switch chain:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        backgroundColor: "#f0f2f5"
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!requireAuth || isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f0f2f5" }}>
        {isAuthenticated && (
          <NextNavBar 
            onLogout={handleLogout}
            selectedChainId={selectedChain}
            onChainChange={handleChainChange}
            showWalletConnect={true}
          />
        )}
        <div style={{ padding: requireAuth ? "24px" : "0" }}>
          {children}
        </div>
      </div>
    );
  }

  return null;
}