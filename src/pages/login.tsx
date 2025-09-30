import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-toastify";
import { createBlockchainSelectionManager, BlockchainServiceManager } from "@nomyx/shared";
import { Modal } from "antd";

// Dynamically import components to avoid SSR issues
const SimpleAdminLoginForm = dynamic(() => import("../components/SimpleAdminLoginForm"), {
  ssr: false,
});

const LoginLayout = dynamic(() => import("../components/LoginLayout"), {
  ssr: false,
});

// Create the BlockchainSelectionManager component
const BlockchainSelectionManager = createBlockchainSelectionManager(React, {
  useState,
  useEffect,
  useCallback,
  Modal
}) as React.ComponentType<any>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState(process.env.NEXT_PUBLIC_SELECTED_CHAIN!);
  const serviceManagerRef = useRef(BlockchainServiceManager.getInstance());

  // DO NOT initialize blockchain service on login page
  // It will be initialized after successful login using NEXT_PUBLIC_SELECTED_CHAIN

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("[Admin Login] Login attempt:", email);

      // Use real Parse authentication (no mock login)
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_PARSE_SERVER_URL!}/functions/authLogin`,
          { email, password },
          {
            headers: {
              "X-Parse-Application-Id": process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID!,
              "X-Parse-Javascript-Key": process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY!,
            },
          }
        );

        const data = response.data;
        const result = data.result || data;

        if (result?.access_token) {
          // Store token expiration (30 minutes from now)
          const expirationTime = Date.now() + 60 * 30 * 1000;
          localStorage.setItem("tokenExpiration", expirationTime.toString());

          // Store session token for Parse Cloud functions
          const sessionToken = result.sessionToken || result.access_token;
          localStorage.setItem("sessionToken", sessionToken);
          console.log("[Admin Login] Stored session token for Parse Cloud functions");

          // Update ParseClient with the new session token
          const ParseClient = await import("../services/ParseClient");
          ParseClient.default.updateSessionToken(sessionToken);

          // Initialize blockchain service with NEXT_PUBLIC_SELECTED_CHAIN
          if (!serviceManagerRef.current.isServiceInitialized()) {
            console.log("[Admin Login] Initializing blockchain service with chain:", process.env.NEXT_PUBLIC_SELECTED_CHAIN);
            await serviceManagerRef.current.initialize(process.env.NEXT_PUBLIC_SELECTED_CHAIN);
          }

          // Use centralized login handling from BlockchainServiceManager
          const { BlockchainServiceManager } = await import("@nomyx/shared");
          const manager = BlockchainServiceManager.getInstance();
          manager.handleLoginSuccess(result.access_token, result.user);
          console.log("[Admin Login] Handled login success via BlockchainServiceManager");

          console.log("[Admin Login] Login successful, redirecting to dashboard");

          // Redirect to dashboard
          router.push("/dashboard");
        } else {
          throw new Error("Invalid credentials");
        }
      } catch (parseError) {
        // If Parse auth fails, show error
        throw new Error("Invalid credentials");
      }
    } catch (error: any) {
      console.error("[Admin Login] Login error:", error);
      toast.error(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle wallet connection request - open the modal
  const handleWalletConnectRequest = async () => {
    console.log("[Admin Login] Opening wallet selection modal");
    setShowWalletModal(true);
  };

  // Handle wallet connection after selection
  const handleWalletConnect = async (address: string, provider: any) => {
    console.log("[Admin Login] Wallet connected:", address, provider);
    setShowWalletModal(false);
    
    if (address) {
      // Store wallet info
      localStorage.setItem("walletAddress", address);
      localStorage.setItem("walletProvider", provider);
      
      // TODO: Implement wallet authentication with backend
      // For now, just redirect to dashboard
      toast.success(`Connected wallet: ${address.substring(0, 8)}...${address.substring(address.length - 6)}`);
      router.push("/dashboard");
    }
  };

  // Handle wallet disconnection
  const handleWalletDisconnect = async () => {
    console.log("[Admin Login] Wallet disconnected");
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletProvider");
  };

  return (
    <LoginLayout>
      <SimpleAdminLoginForm
        onLogin={handleLogin}
        onConnect={handleWalletConnectRequest}
        onWalletConnect={handleWalletConnectRequest}
        onDisconnect={handleWalletDisconnect}
        service={serviceManagerRef.current}
        selectedChainId={selectedChain}
        onChainChange={(chainId: string) => {
          console.log("Chain change:", chainId);
          setSelectedChain(chainId);
        }}
      />
      
      {/* Blockchain Selection Manager for wallet selection */}
      {showWalletModal && (
        <BlockchainSelectionManager
          isVisible={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onWalletConnect={handleWalletConnect}
          onDisconnect={handleWalletDisconnect}
          selectedChainId={selectedChain}
          onChainChange={(chainId: string) => setSelectedChain(chainId)}
          showChainSelector={true}
          allowWalletSelection={true}
          hideOnLogin={false}  // Allow rendering on login page
          isLoggedIn={false}   // We're on the login page
          stellarDevAddress={process.env.NEXT_PUBLIC_STELLAR_DEV_ADDRESS}
          stellarDev2Address={process.env.NEXT_PUBLIC_STELLAR_DEV2_ADDRESS}
        />
      )}
    </LoginLayout>
  );
}