import "react-toastify/dist/ReactToastify.css";

import { useEffect, useState } from "react";

import { Spin } from "antd";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { createBlockchainService, BlockchainType } from "nomyx-ts";
import BlockchainManager from "./components/BlockchainManager";
import DfnsService from "./services/DfnsService";

import ClaimTopicsPage from "./components/ClaimTopicsPage.jsx";
import CreateClaimTopic from "./components/CreateClaimTopic.jsx";
import EditClaimTopic from "./components/EditClaimTopic.jsx";
import CreateDigitalId from "./components/CreateDigitalId.jsx";
import CreatePassword from "./components/CreatePasswordPage.jsx";
import CreateTrustedIssuer from "./components/CreateTrustedIssuer.jsx";
import DigitalIdentityDetailView from "./components/DigitalIdentityDetailPage.jsx";
import EditClaims from "./components/EditClaims.jsx";
import EditClaimsSummaryView from "./components/EditClaimsSummaryView.jsx";
import Home from "./components/Home.jsx";
import IdentitiesPage from "./components/IdentitiesPage.jsx";
import Layout from "./components/Layout";
import Login from "./components/LoginPageWrapper";
import MintPage from "./components/MintPage.jsx";
import NavBar from "./components/NavBar.jsx";
import Protected from "./components/ProtectedWrapper";
import TrustedIssuersPage from "./components/TrustedIssuersPage.jsx";
import ViewClaimTopic from "./components/ViewClaimTopic";
import { RoleContext } from "./context/RoleContext";
import ParseClient from "./services/ParseClient";
import BlockchainService from "./services/BlockchainService.js";
import parseInitialize from "./services/parseInitialize";
import IdentityService from "./services/IdentityService";
import { generateRandomString } from "./utils";
import { AutoLogout } from "nomyx-ts/dist/frontend";
import { WalletPreference } from "./utils/Constants.js";

// localStorage key for persisting selected chain
const SELECTED_CHAIN_STORAGE_KEY = "nomyx-selected-chain";

// Blockchain-agnostic configuration using nomyx-ts
const getSelectedChainId = (): string => {
  // First check localStorage for previously selected chain
  const storedChain = localStorage.getItem(SELECTED_CHAIN_STORAGE_KEY);
  if (storedChain) {
    console.log(`[Admin App] Loaded chain from localStorage: ${storedChain}`);
    return storedChain;
  }

  // Fall back to environment variable or default
  const defaultChain = process.env.REACT_APP_SELECTED_CHAIN || "ethereum-local";
  console.log(`[Admin App] Using default chain: ${defaultChain}`);
  return defaultChain;
};

const validateToken = async (token: string) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_PARSE_SERVER_URL}/functions/authValidate`,
      {},
      {
        headers: {
          "X-Parse-Application-Id": process.env.REACT_APP_PARSE_APPLICATION_ID || "",
          "X-Parse-Javascript-Key": process.env.REACT_APP_PARSE_JAVASCRIPT_KEY || "",
          "x-parse-session-token": token,
        },
      }
    );

    const data = response.data;
    // Parse cloud functions wrap the response in a 'result' object
    const result = data.result || data;
    return {
      valid: result?.valid || false,
      roles: result?.user?.roles || [],
      user: result?.user,
      walletPreference: result?.user?.walletPreference,
      dfnsToken: result?.dfnsToken,
    };
  } catch (error) {
    console.error("Error validating token:", error);
    return {
      valid: false,
      roles: [],
      walletPreference: "",
      dfnsToken: null,
    };
  }
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [blockchainService, setBlockchainService] = useState<BlockchainService | null>(null);
  const [identityService, setIdentityService] = useState<any | null>(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState<any>([]);
  const [walletPreference, setWalletPreference] = useState<WalletPreference | null>(null);
  const [dfnsToken, setDfnsToken] = useState<string | null>(null);
  const [forceLogout, setForceLogout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selectedChainId, setSelectedChainId] = useState<string>(getSelectedChainId());
  // Define the getToken function
  const getToken = async (request: any) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_PARSE_SERVER_URL}/functions/authLogin`, request, {
        headers: {
          "X-Parse-Application-Id": process.env.REACT_APP_PARSE_APPLICATION_ID || "",
          "X-Parse-Javascript-Key": process.env.REACT_APP_PARSE_JAVASCRIPT_KEY || "",
        },
      });
      const data = response.data;
      // Parse cloud functions wrap the response in a 'result' object
      const result = data.result || data;
      return {
        walletPreference: result?.user?.walletPreference,
        token: result?.access_token || "",
        roles: result?.user?.roles || [],
        user: result?.user,
        dfnsToken: result?.dfns_token,
      };
    } catch (error) {
      console.log("Error during authentication:", error);
      return {
        walletPreference: "",
        token: "",
        roles: [],
        user: null,
        dfnsToken: null,
      };
    }
  };

  // Initialize blockchain-agnostic service
  const initializeBlockchainService = async () => {
    console.log(`[Admin App] Initializing BlockchainService for ${selectedChainId}...`);

    try {
      // Use the selectedChainId directly as the chain key
      const chainKey = selectedChainId;

      const _blockchainService = new BlockchainService();

      // Initialize the service with chain configuration
      try {
        await _blockchainService.initialize(chainKey);
        console.log(`[Admin App] BlockchainService initialized successfully for ${selectedChainId}`);
      } catch (error) {
        console.error(`[Admin App] Failed to initialize BlockchainService:`, error);

        // Check if it's a missing contracts error
        const deploymentStatus = await _blockchainService.getDeploymentStatus(chainKey);
        if (!deploymentStatus.hasContracts) {
          console.error(`[Admin App] Missing contract addresses for chain:`, chainKey);
          console.error(`[Admin App] Required contracts:`, deploymentStatus.requiredContracts);
          console.error(`[Admin App] Deployment instructions:`, deploymentStatus.deploymentInstructions);

          // Show user-friendly error message
          const errorMessage = `Missing contract addresses for ${selectedChainId} chain.\n\nRequired contracts:\n${deploymentStatus.requiredContracts.join("\n")}\n\nPlease deploy contracts using the deployment scripts:\n${deploymentStatus.deploymentInstructions}`;
          toast.error(errorMessage);

          // For now, still set the service so the UI doesn't crash
          // but operations will fail gracefully
          setBlockchainService(_blockchainService);
          return;
        }
        throw error;
      }

      setBlockchainService(_blockchainService);

      // Create IdentityService with the BlockchainService
      const _identityService = new IdentityService(_blockchainService);
      setIdentityService(_identityService);

      console.log(`[Admin App] BlockchainService and IdentityService initialized for ${selectedChainId}`);
    } catch (error) {
      console.error(`[Admin App] Failed to initialize BlockchainService:`, error);
      toast.error(`Failed to initialize blockchain service: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  };

  const onConnect = async (address?: any, provider?: any) => {
    if (isConnected) {
      return;
    }

    console.log(`[Admin App] Connecting wallet for ${selectedChainId}...`, { address, provider });

    try {
      // Ensure blockchain service is initialized
      if (!blockchainService) {
        await initializeBlockchainService();
      }

      const RandomString = generateRandomString(10);
      const message = `Sign this message to validate that you are the owner of the account. Random string: ${RandomString}`;

      let signature: string;

      // Check if we're in dev mode with dev wallet
      const isDev = process.env.NODE_ENV === "development";
      if (isDev && provider === "dev") {
        // For dev wallet, use simulated signature
        signature = "dev-signature-" + RandomString;
        console.log(`[Admin App] Using dev wallet with simulated signature`);
      } else {
        // For real wallets, we need to implement actual signature
        // This would require integrating with the actual wallet provider
        // For now, we'll use a simulated signature with the provider name
        signature = `${provider}-signature-${RandomString}`;
        console.log(`[Admin App] Using ${provider} wallet (signature simulation for now)`);

        // TODO: Implement actual wallet signature
        // const signature = await blockchainService.signMessage(message, address, provider);
      }

      const { token, roles, walletPreference, dfnsToken }: any = await getToken({
        message: message,
        signature: signature,
        address: address,
        blockchain: selectedChainId.split("-")[0], // Extract blockchain type
      });

      if (roles.length > 0) {
        setRole([...roles]);
        setUser(user);
        setWalletPreference(walletPreference);
        setDfnsToken(dfnsToken);
        localStorage.setItem("sessionToken", token);
        setIsConnected(true);

        try {
          parseInitialize();
          console.log(`[Admin App] Successfully connected to ${selectedChainId} with address ${address}`);
        } catch (error) {
          console.error(`[Admin App] Failed to initialize Parse:`, error);
          // Don't prevent login, just show error
        }
      } else {
        toast.error("Sorry you are not authorized!");
        setForceLogout(true);
      }
    } catch (error: any) {
      console.error(`[Admin App] Connection error:`, error);
      toast.error(error.message || "Connection failed");
      setForceLogout(true);
    }
  };

  // Define the onLogout function for both email/password and wallet login
  const onLogoutEmailPassword = async () => {
    try {
      // Ensure Parse is initialized
      parseInitialize();

      // Use Parse SDK logout
      await ParseClient.logout();
    } catch (error) {
      console.error("Error during logout:", error);
      // Continue with client-side cleanup even if server logout fails
    }

    // Reset client-side state
    setRole([]);
    setWalletPreference(null);
    setDfnsToken(null);
    setUser(null);
    setForceLogout(false);
    setIsConnected(false);
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("tokenExpiration");
    setBlockchainService(null);
    setIdentityService(null);

    toast.success("Logged out successfully.");
  };

  // Username/Password Login (blockchain-agnostic)
  const onLogin = async (email: string, password: string) => {
    console.log(`[Admin App] Logging in user via email/password...`);

    const { token, roles, walletPreference, user, dfnsToken } = await getToken({ email, password });

    const expirationTime = Date.now() + 60 * 30 * 1000; // 30m logout
    if (roles.length > 0) {
      setRole([...roles]);
      setUser(user);
      setDfnsToken(dfnsToken);
      setWalletPreference(walletPreference);
      localStorage.setItem("sessionToken", token);
      localStorage.setItem("tokenExpiration", expirationTime.toString());
      setIsConnected(true);

      console.log(`[Admin App] Initializing blockchain service for ${selectedChainId}...`);
      try {
        await initializeBlockchainService();
        parseInitialize();
        console.log(`[Admin App] User logged in successfully for ${selectedChainId}`);
      } catch (error) {
        console.error(`[Admin App] Failed to initialize blockchain service:`, error);
        // Don't prevent login, just show error
      }
    } else {
      toast.error("Sorry, you are not authorized!");
      setForceLogout(true);
    }
  };

  // Chain switching functionality
  const switchChain = async (newChainId: string) => {
    console.log(`[Admin App] Switching from ${selectedChainId} to ${newChainId}`);

    const previousChainId = selectedChainId;
    setSelectedChainId(newChainId);

    // Persist the new chain selection to localStorage
    localStorage.setItem(SELECTED_CHAIN_STORAGE_KEY, newChainId);
    console.log(`[Admin App] Persisted chain selection to localStorage: ${newChainId}`);

    // Create a new BlockchainService instance for the new chain
    // This ensures components get a fresh service reference and re-render properly
    try {
      console.log(`[Admin App] Creating new BlockchainService for ${newChainId}`);
      const newBlockchainService = new BlockchainService();

      // Initialize the new service with the target chain
      await newBlockchainService.initialize(newChainId);

      // Update the service reference - this triggers React re-renders
      setBlockchainService(newBlockchainService);

      // Create new IdentityService with the new BlockchainService
      const newIdentityService = new IdentityService(newBlockchainService);
      setIdentityService(newIdentityService);

      console.log(`[Admin App] Successfully switched to ${newChainId} with new service instances`);
    } catch (error) {
      console.error(`[Admin App] Failed to switch blockchain service:`, error);
      toast.error(`Failed to switch to ${newChainId}: ${error instanceof Error ? error.message : "Unknown error"}`);

      // Revert the chain selection and localStorage
      setSelectedChainId(previousChainId);
      localStorage.setItem(SELECTED_CHAIN_STORAGE_KEY, previousChainId);
      console.log(`[Admin App] Reverted chain selection to localStorage: ${previousChainId}`);
      return;
    }

    // Also update DfnsService to use the new chain
    try {
      // Pass the full chain ID to DfnsService
      DfnsService.switchChain(newChainId);
      console.log(`[Admin App] DfnsService switched to ${newChainId}`);
    } catch (error) {
      console.error(`[Admin App] Failed to switch DfnsService:`, error);
    }
  };

  const restoreSession = async () => {
    const token = localStorage.getItem("sessionToken");
    if (token) {
      const { valid, roles, walletPreference, user, dfnsToken } = await validateToken(token);
      if (valid && roles.length > 0) {
        setRole(roles);
        setUser(user);
        setDfnsToken(dfnsToken);
        setWalletPreference(walletPreference);
        setIsConnected(true);

        // Initialize blockchain service when restoring session
        console.log(`[Admin App] Restoring session and initializing blockchain service...`);
        try {
          await initializeBlockchainService();
          parseInitialize();
        } catch (error) {
          console.error(`[Admin App] Failed to initialize blockchain service during session restore:`, error);
          // Don't prevent session restore, just show error
        }
      } else {
        // Token is invalid or roles are empty
        localStorage.removeItem("sessionToken");
        localStorage.removeItem("tokenExpiration");
        setForceLogout(true);
      }
    }
    setInitializing(false);
  };

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // // Handle forced logout
  // useEffect(() => {
  //   if (forceLogout) {
  //     // Clear state and localStorage
  //     setRole([]);
  //     setIsConnected(false);
  //     localStorage.removeItem("sessionToken");
  //     setForceLogout(false);
  //   }
  // }, [forceLogout]);

  // Handle loading state when roles change
  useEffect(() => {
    if (role.length > 0) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  }, [role]);

  const onDisconnect = () => {
    setRole([]);
    setDfnsToken(null);
    setUser(null);
    setWalletPreference(null);
    setForceLogout(false);
    setIsConnected(false);
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("tokenExpiration");
    setBlockchainService(null);
    setIdentityService(null);
  };

  if (initializing) {
    return (
      <div className="z-50 h-screen w-screen flex justify-center items-center">
        <Spin />
      </div>
    );
  }

  return (
    <RoleContext.Provider value={{ role, setRole, walletPreference, setWalletPreference, dfnsToken, setDfnsToken, user, setUser }}>
      {/* Loading Spinner Overlay */}
      {loading && (
        <div className="z-50 h-screen w-screen overflow-hidden absolute top-0 left-0 flex justify-center items-center bg-[#00000040]">
          <Spin />
        </div>
      )}
      <Router>
        <AutoLogout />

        {/* Blockchain Manager (Only visible when logged in) */}
        {role.length > 0 && <BlockchainManager selectedChainId={selectedChainId} onChainChange={switchChain} onLogout={onLogoutEmailPassword} />}

        {/* Navigation Bar (Only visible when logged in) */}
        {role.length > 0 && (
          <div className={`topnav p-0`}>
            <NavBar onConnect={onConnect} onDisconnect={onDisconnect} onLogout={onLogoutEmailPassword} role={role} />
          </div>
        )}

        <Layout>
          <div className={`${role.length === 0 ? "p-0 -ml-4 overflow-hidden" : "content"}`}>
            <ToastContainer
              position="bottom-right"
              className="toast-background"
              progressClassName="toast-progress-bar"
              autoClose={2500}
              closeOnClick
              pauseOnHover={false}
              pauseOnFocusLoss={false}
              draggable={false}
              limit={1}
              newestOnTop={false}
              hideProgressBar={false}
            />
            {/* Application Routes */}
            <Routes>
              <Route
                path="/"
                element={
                  <Protected role={"CentralAuthority"} roles={role}>
                    <Home />
                  </Protected>
                }
              />
              <Route
                path="/login"
                element={
                  <Login
                    forceLogout={forceLogout}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    onLogin={onLogin}
                    service={blockchainService}
                    selectedChainId={selectedChainId}
                    onChainChange={switchChain}
                    role={role}
                  />
                }
              />
              <Route path="/create-password/:token" element={<CreatePassword service={blockchainService} />} />

              <Route
                path="/topics"
                element={
                  <Protected role={"CentralAuthority"} roles={role}>
                    <ClaimTopicsPage service={blockchainService} />
                  </Protected>
                }
              />
              <Route
                path="/topics/create"
                element={
                  <Protected role={"CentralAuthority"} roles={role}>
                    {" "}
                    <CreateClaimTopic service={blockchainService} />
                  </Protected>
                }
              />
              <Route
                path="/topics/:topicId"
                element={
                  <Protected role={"CentralAuthority"} roles={role}>
                    <ViewClaimTopic service={blockchainService} />
                  </Protected>
                }
              />
              <Route
                path="/topics/:topicId/edit"
                element={
                  <Protected role={"CentralAuthority"} roles={role}>
                    <EditClaimTopic service={blockchainService} />
                  </Protected>
                }
              />
              <Route
                path="/issuers"
                element={
                  <Protected role={"CentralAuthority"} roles={role}>
                    <TrustedIssuersPage service={blockchainService} />
                  </Protected>
                }
              />
              <Route
                path="/issuers/create"
                element={
                  <Protected role={"CentralAuthority"} roles={role}>
                    <CreateTrustedIssuer service={blockchainService} />
                  </Protected>
                }
              />
              <Route
                path="/issuers/:issuerId"
                element={
                  <Protected role={"CentralAuthority"} roles={role}>
                    <CreateTrustedIssuer service={blockchainService} />
                  </Protected>
                }
              />
              <Route
                path="/identities"
                element={
                  <Protected role={"TrustedIssuer"} roles={role}>
                    <IdentitiesPage service={identityService} />
                  </Protected>
                }
              />
              <Route
                path="/identities/create"
                element={
                  <Protected role={"TrustedIssuer"} roles={role}>
                    <CreateDigitalId service={identityService} />
                  </Protected>
                }
              />
              <Route
                path="/identities/:identityId/:userId?"
                element={
                  <Protected role={"TrustedIssuer"} roles={role}>
                    <DigitalIdentityDetailView service={identityService} />
                  </Protected>
                }
              />
              <Route
                path="/identities/:identityId/edit"
                element={
                  <Protected role={"TrustedIssuer"} roles={role}>
                    <EditClaims service={identityService} />
                  </Protected>
                }
              />
              <Route
                path="/identities/:identity/edit/summary"
                element={
                  <Protected role={"TrustedIssuer"} roles={role}>
                    <EditClaimsSummaryView service={identityService} />
                  </Protected>
                }
              />
              <Route
                path="/mint"
                element={
                  <Protected role={"TrustedIssuer"} roles={role}>
                    <MintPage service={blockchainService} />
                  </Protected>
                }
              />
            </Routes>
          </div>
        </Layout>
      </Router>
    </RoleContext.Provider>
  );
}

export default App;
