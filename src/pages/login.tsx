import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-toastify";
import { createBlockchainSelectionManager, BlockchainServiceManager } from "@nomyx/shared";
import { Modal } from "antd";
import TransactionModal from "../components/shared/TransactionModal";
import { WebAuthnSigner } from "@dfns/sdk-browser";

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
  const [transactionModal, setTransactionModal] = useState({
    visible: false,
    status: 'error' as 'loading' | 'success' | 'error',
    title: 'Login Error',
    loadingMessage: '',
    successMessage: '',
    errorMessage: ''
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

        // Store DFNS token if available
        if (result.dfns_token) {
          localStorage.setItem("nomyx-dfns-token", result.dfns_token);
          console.log("[Admin Login] ✅ Stored DFNS token for wallet operations");
        } else {
          console.log("[Admin Login] ⚠️ No DFNS token received (wallet operations may be unavailable)");
        }

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
        manager.handleLoginSuccess(result.access_token, result.user, result.dfns_token);
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
      errorMessage: ''
    });

    try {
      // Step 1: Call registerInit to get WebAuthn challenge
      console.log("[Admin Login] Step 1: Calling registerInit");
      const initResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_PARSE_SERVER_URL!}/functions/registerInit`,
        { username: email },
        {
          headers: {
            "X-Parse-Application-Id": process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID!,
            "X-Parse-Javascript-Key": process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY!,
          },
        }
      );

      const challengeData = initResponse.data.result;
      console.log("[Admin Login] Received registration challenge:", challengeData);

      // Check WebAuthn support
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.");
      }

      // Step 2: Create WebAuthn credential (registration uses create(), not sign())
      console.log("[Admin Login] Step 2: Creating WebAuthn credential for registration");

      // Add missing 'rp' (Relying Party) field that DFNS challenge doesn't include
      const enrichedChallengeData = {
        ...challengeData,
        rp: {
          id: window.location.hostname,
          name: "Nomyx Admin Portal"
        }
      };

      console.log("[Admin Login] Enriched challenge data with rp field:", enrichedChallengeData);

      const webauthn = new WebAuthnSigner();
      console.log("[Admin Login] WebAuthnSigner created, calling create() for registration...");

      let attestation;
      try {
        attestation = await webauthn.create(enrichedChallengeData);
        console.log("[Admin Login] ✅ WebAuthn credential creation successful");

        // DETAILED LOGGING: Inspect attestation structure
        console.log("[Admin Login] Full attestation object:", JSON.stringify(attestation, null, 2));
        console.log("[Admin Login] attestation.credentialKind:", attestation.credentialKind);
        console.log("[Admin Login] attestation.kind:", attestation.kind);
        console.log("[Admin Login] attestation.credentialInfo:", attestation.credentialInfo);
        console.log("[Admin Login] All attestation keys:", Object.keys(attestation));
      } catch (createError: any) {
        console.error("[Admin Login] WebAuthn credential creation failed:", createError);
        throw new Error(`WebAuthn credential creation failed: ${createError.message}. Please make sure you're using HTTPS or localhost, and that your browser supports WebAuthn.`);
      }

      // Decode challenge to get ID
      const challengeJson = JSON.parse(atob(challengeData.challenge));
      console.log("[Admin Login] Challenge ID:", challengeJson.id);

      // WebAuthnSigner.create() returns the attestation in DFNS format
      // Determine which field to use: credentialKind or kind
      const credentialKindValue = attestation.credentialKind || attestation.kind;
      console.log("[Admin Login] Using credentialKind value:", credentialKindValue);

      const signedChallenge = {
        challengeIdentifier: challengeJson.id,
        firstFactor: {
          kind: credentialKindValue,  // Use whichever field exists
          credentialInfo: attestation.credentialInfo
        }
      };

      console.log("[Admin Login] Constructed signedChallenge:", JSON.stringify(signedChallenge, null, 2));

      // Step 3: Call registerComplete with signed challenge
      console.log("[Admin Login] Step 3: Calling registerComplete");
      await axios.post(
        `${process.env.NEXT_PUBLIC_PARSE_SERVER_URL!}/functions/registerComplete`,
        {
          signedChallenge,
          temporaryAuthenticationToken: challengeData.temporaryAuthenticationToken,
        },
        {
          headers: {
            "X-Parse-Application-Id": process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID!,
            "X-Parse-Javascript-Key": process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY!,
          },
        }
      );

      console.log("[Admin Login] ✅ DFNS registration successful!");

      // Show success message briefly
      setTransactionModal({
        visible: true,
        status: 'success',
        title: 'Registration Successful',
        loadingMessage: '',
        successMessage: 'DFNS registration complete! Logging you in...',
        errorMessage: ''
      });

      // Wait a moment for user to see success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 4: Automatically retry login with the same credentials
      console.log("[Admin Login] Step 4: Retrying login after registration");
      setTransactionModal({ ...transactionModal, visible: false });
      await handleLogin(email, password);

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

      // Show registration error
      setTransactionModal({
        visible: true,
        status: 'error',
        title: 'Registration Failed',
        loadingMessage: '',
        successMessage: '',
        errorMessage: errorMessage
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
        onClose={() => setTransactionModal({ ...transactionModal, visible: false })}
        autoCloseDelay={5000}
      />
    </LoginLayout>
  );
}