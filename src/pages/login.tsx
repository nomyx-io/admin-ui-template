import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-toastify";
import { createBlockchainSelectionManager, createWalletSuccessModal, createExplorerLink, BlockchainServiceManager } from "@nomyx/shared";
import { Modal } from "antd";
import TransactionModal from "../components/shared/TransactionModal";

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

// Create WalletSuccessModal component
const WalletSuccessModal = createWalletSuccessModal(React, { useState, useEffect, useMemo, createExplorerLink });

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState(process.env.NEXT_PUBLIC_SELECTED_CHAIN!);
  const serviceManagerRef = useRef(BlockchainServiceManager.getInstance());

  // State for wallet success modal
  const [walletSuccessModal, setWalletSuccessModal] = useState<{
    visible: boolean;
    walletAddress: string;
    explorerUrl?: string | null;
  }>({
    visible: false,
    walletAddress: '',
    explorerUrl: null
  });

  const [transactionModal, setTransactionModal] = useState({
    visible: false,
    status: 'error' as 'loading' | 'success' | 'error',
    title: 'Login Error',
    loadingMessage: '',
    successMessage: '',
    errorMessage: '',
    data: undefined as Record<string, any> | undefined,
    showDetails: false
  });

  // DO NOT initialize blockchain service on login page
  // It will be initialized after successful login using NEXT_PUBLIC_SELECTED_CHAIN

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("[Admin Login] Login attempt:", email);

      // Use real Parse authentication (no mock login)
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

        // SECURITY: DFNS delegated token is stored securely on backend (Parse Session)
        // Frontend never receives or stores the delegated token
        console.log("[Admin Login] DFNS wallet operations will use session token (delegated token stored securely on backend)");

        // Update ParseClient with the new session token
        const ParseClient = await import("../services/ParseClient");
        ParseClient.default.updateSessionToken(sessionToken);

        // Initialize blockchain service with NEXT_PUBLIC_SELECTED_CHAIN
        if (!serviceManagerRef.current.isServiceInitialized()) {
          console.log("[Admin Login] Initializing blockchain service with chain:", process.env.NEXT_PUBLIC_SELECTED_CHAIN);
          await serviceManagerRef.current.initialize(process.env.NEXT_PUBLIC_SELECTED_CHAIN);
        }

        // Use centralized login handling from BlockchainServiceManager
        // SECURITY: No longer pass dfns_token (it's stored securely on backend)
        const { BlockchainServiceManager } = await import("@nomyx/shared");
        const manager = BlockchainServiceManager.getInstance();
        manager.handleLoginSuccess(result.access_token, result.user);
        console.log("[Admin Login] Handled login success via BlockchainServiceManager");

        console.log("[Admin Login] Login successful, redirecting to dashboard");

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        // Show error modal
        setTransactionModal({
          visible: true,
          status: 'error',
          title: 'Login Failed',
          loadingMessage: '',
          successMessage: '',
          errorMessage: 'Invalid credentials. Please check your email and password.'
        });
      }
    } catch (error: any) {
      // FIRST: Extract error message BEFORE any logging to check if this is expected auto-registration case
      let errorMessage = 'Login failed. Please check your credentials and try again.';

      if (error.response?.data?.error) {
        // Parse Cloud error
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        // Generic Parse error
        errorMessage = error.response.data.message;
      } else if (error.message) {
        // JavaScript error
        errorMessage = error.message;
      }

      // Check for DFNS "User not found" error and trigger auto-registration
      // Do this BEFORE logging to prevent Next.js overlay
      if (errorMessage.includes('User not found')) {
        console.log("[Admin Login] DFNS user not found - triggering auto-registration");
        setIsLoading(false);
        await handleDfnsRegistration(email, password);
        return;
      }

      // ONLY log error if it's NOT the expected registration case
      console.error("[Admin Login] Login error:", error);

      // Show error in modal
      setTransactionModal({
        visible: true,
        status: 'error',
        title: 'Login Failed',
        loadingMessage: '',
        successMessage: '',
        errorMessage: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle DFNS auto-registration when user doesn't exist
  const handleDfnsRegistration = async (email: string, password: string) => {
    console.log("[Admin Login] Starting DFNS registration for:", email);

    // Show registration loading modal
    setTransactionModal({
      visible: true,
      status: 'loading',
      title: 'DFNS Registration',
      loadingMessage: 'Creating secure passkey credential...',
      successMessage: '',
      errorMessage: '',
      data: undefined,
      showDetails: false
    });

    try {
      // Import shared DFNS registration utility
      const { registerDFNSUser } = await import("@nomyx/shared");

      // Get current chain ID for wallet creation
      const currentChainId = serviceManagerRef.current.getCurrentChainId() || process.env.NEXT_PUBLIC_SELECTED_CHAIN || 'stellar-local';

      // Call shared registration utility
      const result = await registerDFNSUser({
        email,
        password,
        parseServerUrl: process.env.NEXT_PUBLIC_PARSE_SERVER_URL!,
        parseAppId: process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID!,
        parseJsKey: process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY!,
        chainId: currentChainId,
        relyingPartyName: "Nomyx Admin Portal",
        onProgress: (message) => {
          console.log("[Admin Login]", message);
          setTransactionModal(prev => ({
            ...prev,
            loadingMessage: message
          }));
        }
      });

      if (!result.success) {
        // Show error in modal (NOT throw - prevents Next.js overlay)
        setTransactionModal({
          visible: true,
          status: 'error',
          title: 'Registration Failed',
          loadingMessage: '',
          successMessage: '',
          errorMessage: result.error || 'DFNS registration failed. Please try again.',
          data: undefined,
          showDetails: false
        });
        return;
      }

      // Registration successful!
      console.log("[Admin Login] ✅ DFNS registration successful!");

      // Check if wallets were created
      const createdWallets = result.wallets || [];
      console.log(`[Admin Login] 📋 Wallets created during registration: ${createdWallets.length}`);

      // Show appropriate success modal based on wallet status
      if (createdWallets.length > 0) {
        // Map chain ID to DFNS network name to find current wallet
        const getDFNSNetworkName = (chainId: string): string => {
          if (chainId === 'stellar-mainnet') return 'Stellar';
          if (chainId === 'stellar-testnet' || chainId === 'stellar-local') return 'StellarTestnet';
          if (chainId.includes('basesep')) return 'BaseSepolia';
          if (chainId.includes('optsep')) return 'OptimismSepolia';
          if (chainId.includes('sepolia')) return 'Sepolia';
          return 'Ethereum';
        };

        const targetNetwork = getDFNSNetworkName(currentChainId);
        const currentWallet = createdWallets.find((w: any) => w.network === targetNetwork);

        if (currentWallet) {
          // Hide transaction modal
          setTransactionModal({ ...transactionModal, visible: false });

          // Get explorer URL from current chain config
          const currentChain = serviceManagerRef.current.getCurrentChain();
          const explorerUrl = currentChain?.config?.chain_explorer_url || null;

          // Show wallet success modal
          setWalletSuccessModal({
            visible: true,
            walletAddress: currentWallet.address,
            explorerUrl: explorerUrl
          });

          // Wait for user to close the modal (handled by modal close handler)
          return;
        } else {
          // Show generic success for other networks
          setTransactionModal({
            visible: true,
            status: 'success',
            title: 'Registration Complete',
            loadingMessage: '',
            successMessage: 'DFNS registration complete! You can set up your wallet from the dashboard. Redirecting...',
            errorMessage: '',
            data: undefined,
            showDetails: false
          });

          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } else {
        // No wallets created yet
        setTransactionModal({
          visible: true,
          status: 'success',
          title: 'Registration Complete',
          loadingMessage: '',
          successMessage: 'DFNS registration complete! You can set up your wallet from the dashboard. Redirecting...',
          errorMessage: '',
          data: undefined,
          showDetails: false
        });

        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Hide modal
      setTransactionModal({ ...transactionModal, visible: false });

      // Store session and redirect
      console.log("[Admin Login] Storing session and redirecting");

      localStorage.setItem("sessionToken", result.sessionToken!);
      localStorage.setItem("tokenExpiration", (Date.now() + 60 * 30 * 1000).toString());

      // Update ParseClient
      const ParseClient = await import("../services/ParseClient");
      ParseClient.default.updateSessionToken(result.sessionToken!);

      // Initialize blockchain service
      if (!serviceManagerRef.current.isServiceInitialized()) {
        console.log("[Admin Login] Initializing blockchain service with chain:", process.env.NEXT_PUBLIC_SELECTED_CHAIN);
        await serviceManagerRef.current.initialize(process.env.NEXT_PUBLIC_SELECTED_CHAIN);
      }

      // Use centralized login handling from BlockchainServiceManager
      const { BlockchainServiceManager } = await import("@nomyx/shared");
      const manager = BlockchainServiceManager.getInstance();
      manager.handleLoginSuccess(result.sessionToken!, result.user);

      router.push("/dashboard");

    } catch (error: any) {
      console.error("[Admin Login] DFNS registration failed:", error);

      let errorMessage = 'DFNS registration failed. Please try again.';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Show registration error in modal (NOT throw)
      setTransactionModal({
        visible: true,
        status: 'error',
        title: 'Registration Failed',
        loadingMessage: '',
        successMessage: '',
        errorMessage: errorMessage,
        data: undefined,
        showDetails: false
      });
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

  // Handle wallet success modal close - complete login flow
  const handleWalletModalClose = async () => {
    // Close modal
    setWalletSuccessModal({ visible: false, walletAddress: '', explorerUrl: null });

    // Complete the login flow - this code was after the modal show in original flow
    console.log("[Admin Login] Completing login after wallet modal close");

    // Get the stored session token from the registration result
    const sessionToken = localStorage.getItem("sessionToken");
    if (!sessionToken) {
      toast.error("Session lost. Please try logging in again.");
      return;
    }

    // Initialize blockchain service
    if (!serviceManagerRef.current.isServiceInitialized()) {
      console.log("[Admin Login] Initializing blockchain service with chain:", process.env.NEXT_PUBLIC_SELECTED_CHAIN);
      await serviceManagerRef.current.initialize(process.env.NEXT_PUBLIC_SELECTED_CHAIN);
    }

    // Use centralized login handling from BlockchainServiceManager
    const { BlockchainServiceManager } = await import("@nomyx/shared");
    const manager = BlockchainServiceManager.getInstance();

    // Get user from localStorage if available
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    manager.handleLoginSuccess(sessionToken, user);

    router.push("/dashboard");
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

      {/* Transaction/Error Modal */}
      <TransactionModal
        visible={transactionModal.visible}
        status={transactionModal.status}
        title={transactionModal.title}
        loadingMessage={transactionModal.loadingMessage}
        successMessage={transactionModal.successMessage}
        errorMessage={transactionModal.errorMessage}
        data={transactionModal.data}
        showDetails={transactionModal.showDetails}
        onClose={() => setTransactionModal({ ...transactionModal, visible: false })}
        autoCloseDelay={5000}
      />

      {/* Wallet Success Modal */}
      <WalletSuccessModal
        visible={walletSuccessModal.visible}
        walletAddress={walletSuccessModal.walletAddress}
        explorerUrl={walletSuccessModal.explorerUrl}
        onClose={handleWalletModalClose}
      />
    </LoginLayout>
  );
}