import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { signIn, getCsrfToken, getSession } from "next-auth/react";
import { toast } from "react-toastify";
import { createBlockchainSelectionManager, createWalletSuccessModal, createExplorerLink, BlockchainServiceManager, PortalStorage } from "@nomyx/shared";
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

  // Check if already logged in and redirect
  useEffect(() => {
    const checkAndRedirect = async () => {
      const session = await getSession();
      if (session?.user?.accessToken) {
        router.push("/dashboard");
      }
    };
    checkAndRedirect();
  }, [router]);

  // Handle standard login with NextAuth
  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("[Admin Login] Login attempt:", email);

      const result = await signIn("standard", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      // Check if login failed due to user not found - trigger DFNS registration
      if (!result?.ok && result?.status === 401) {
        console.log("[Admin Login] Login failed with 401 - attempting DFNS registration");
        setIsLoading(false);
        await handleDfnsRegistration(email, password);
        return;
      }

      if (!result?.ok) {
        toast.error("An error occurred during login.");
        throw new Error("Login failed");
      }

      // Check session with retries
      const maxRetries = 5;
      let session = null;

      for (let i = 0; i < maxRetries; i++) {
        session = await getSession();
        if (session?.user?.accessToken) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!session?.user?.accessToken) {
        toast.error("Session initialization failed");
        throw new Error("Session initialization failed");
      }

      // Store session token in PortalStorage for compatibility with Parse SDK
      PortalStorage.setItem("sessionToken", session.user.accessToken);
      PortalStorage.setItem("tokenExpiration", (Date.now() + 60 * 30 * 1000).toString());

      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (error) {
      console.error("[Admin Login] Error:", error);
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
        email: email.toLowerCase(),
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
          setTransactionModal({ ...transactionModal, visible: false });

          const currentChain = serviceManagerRef.current.getCurrentChain();
          const explorerUrl = currentChain?.config?.chain_explorer_url || null;

          setWalletSuccessModal({
            visible: true,
            walletAddress: currentWallet.address,
            explorerUrl: explorerUrl
          });
          return;
        }
      }

      // Show success and auto-login
      toast.success("Registration complete! Logging in...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Hide modal
      setTransactionModal({ ...transactionModal, visible: false });

      // Retry login after successful registration
      const retryResult = await signIn("standard", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (retryResult?.ok) {
        const maxRetries = 5;
        let session = null;

        for (let i = 0; i < maxRetries; i++) {
          session = await getSession();
          if (session?.user?.accessToken) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (session?.user?.accessToken) {
          PortalStorage.setItem("sessionToken", session.user.accessToken);
          PortalStorage.setItem("tokenExpiration", (Date.now() + 60 * 30 * 1000).toString());

          toast.success("Login successful!");
          router.push("/dashboard");
          return;
        }
      }

      toast.error("Registration succeeded but login failed. Please try logging in again.");
    } catch (error: any) {
      console.error("[Admin Login] DFNS registration failed:", error);

      setTransactionModal({
        visible: true,
        status: 'error',
        title: 'Registration Failed',
        loadingMessage: '',
        successMessage: '',
        errorMessage: error.message || 'DFNS registration failed. Please try again.',
        data: undefined,
        showDetails: false
      });
    }
  };

  // Handle wallet connection request
  const handleWalletConnectRequest = async () => {
    console.log("[Admin Login] Opening wallet selection modal");
    setShowWalletModal(true);
  };

  // Handle wallet connection after selection
  const handleWalletConnect = async (address: string, provider: any) => {
    console.log("[Admin Login] Wallet connected:", address, provider);
    setShowWalletModal(false);

    if (address) {
      PortalStorage.setItem("walletAddress", address);
      PortalStorage.setItem("walletProvider", provider);

      toast.success(`Connected wallet: ${address.substring(0, 8)}...${address.substring(address.length - 6)}`);
      router.push("/dashboard");
    }
  };

  // Handle wallet disconnection
  const handleWalletDisconnect = async () => {
    console.log("[Admin Login] Wallet disconnected");
    PortalStorage.removeItem("walletAddress");
    PortalStorage.removeItem("walletProvider");
  };

  // Handle wallet success modal close
  const handleWalletModalClose = async () => {
    setWalletSuccessModal({ visible: false, walletAddress: '', explorerUrl: null });

    const email = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value || '';
    const password = (document.querySelector('input[type="password"]') as HTMLInputElement)?.value || '';

    if (!email || !password) {
      toast.error('Unable to proceed with login. Please refresh and try again.');
      return;
    }

    toast.info("Completing login...", { autoClose: 2000 });

    try {
      const retryResult = await signIn("standard", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (retryResult?.ok) {
        const maxRetries = 5;
        let session = null;

        for (let i = 0; i < maxRetries; i++) {
          session = await getSession();
          if (session?.user?.accessToken) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (session?.user?.accessToken) {
          PortalStorage.setItem("sessionToken", session.user.accessToken);
          PortalStorage.setItem("tokenExpiration", (Date.now() + 60 * 30 * 1000).toString());

          toast.success("Login successful!");
          router.push("/dashboard");
          return;
        }
      }

      toast.error("Login failed. Please try again.");
    } catch (error) {
      console.error("Login retry error:", error);
      toast.error("An error occurred. Please try again.");
    }
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