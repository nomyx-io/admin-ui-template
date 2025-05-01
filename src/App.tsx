import "react-toastify/dist/ReactToastify.css";

import { useEffect, useState } from "react";

import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { Spin } from "antd";
import axios from "axios";
import { ethers } from "ethers";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { configureChains, createConfig, WagmiConfig, Chain } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";

import ClaimTopicsPage from "./components/ClaimTopicsPage.jsx";
import CreateClaimTopic from "./components/CreateClaimTopic.jsx";
import CreateDigitalId from "./components/CreateDigitalId.jsx";
import CreatePassword from "./components/CreatePasswordPage.jsx";
import CreateTrustedIssuer from "./components/CreateTrustedIssuer.jsx";
import DigitalIdentityDetailView from "./components/DigitalIdentityDetailPage.jsx";
import EditClaims from "./components/EditClaims.jsx";
import EditClaimsSummaryView from "./components/EditClaimsSummaryView.jsx";
import Home from "./components/Home.jsx";
import IdentitiesPage from "./components/IdentitiesPage.jsx";
import Layout from "./components/Layout";
import Login from "./components/LoginPage.jsx";
import MintPage from "./components/MintPage.jsx";
import NavBar from "./components/NavBar.jsx";
import Protected from "./components/Protected";
import TrustedIssuersPage from "./components/TrustedIssuersPage.jsx";
import ViewClaimTopic from "./components/ViewClaimTopic";
import { RoleContext } from "./context/RoleContext";
import BlockchainService from "./services/BlockchainService.js";
import parseInitialize from "./services/parseInitialize";
import { generateRandomString } from "./utils";
import AutoLogout from "./utils/AutoLogout";
import { WalletPreference } from "./utils/Constants.js";

const localhost: Chain = {
  id: 31337,
  name: "Localhost",
  network: "localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [process.env.REACT_APP_NETWORK_LOCALHOST || ""],
    },
    public: {
      http: [process.env.REACT_APP_NETWORK_LOCALHOST || ""],
    },
  },
  testnet: true,
};

const baseSep: Chain = {
  id: 84532,
  network: "base",
  name: "Base Sepolia",
  nativeCurrency: {
    name: "Base",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.REACT_APP_NETWORK_BASE_SEPOLIA || ""],
    },
    public: {
      http: [process.env.REACT_APP_NETWORK_BASE_SEPOLIA || ""],
    },
  },
};

const optSep: Chain = {
  id: 11155420,
  network: "optimism",
  name: "Optimism Sepolia",
  nativeCurrency: {
    name: "OP Sepolia",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.REACT_APP_NETWORK_OPTIMISM_SEPOLIA || ""],
    },
    public: {
      http: [process.env.REACT_APP_NETWORK_OPTIMISM_SEPOLIA || ""],
    },
  },
};

const base: Chain = {
  id: 8453,
  network: "base",
  name: "Base",
  nativeCurrency: {
    name: "Base",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.REACT_APP_NETWORK_BASE || ""],
    },
    public: {
      http: [process.env.REACT_APP_NETWORK_BASE || ""],
    },
  },
};

const { chains, publicClient } = configureChains(
  [base, baseSep, localhost, optSep], // mainnet, polygon, optimism, arbitrum, zora,
  [alchemyProvider({ apiKey: "CSgNtTJ6_Clrf1zNjVp2j1ppfLE2-aVX" }), publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: "LL Testing",
  projectId: "ae575761a72370ab88834655acbba677",
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

const validateToken = async (token: string) => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_PARSE_SERVER_URL}/auth/validate`, {
      headers: {
        "x-parse-session-token": token,
      },
    });

    const data = response.data;
    return {
      valid: data?.valid || false,
      roles: data?.user?.roles || [],
      user: data?.user,
      walletPreference: data?.user?.walletPreference,
      dfnsToken: data?.dfnsToken,
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
  const [user, setUser] = useState(null); // State to hold user
  const [role, setRole] = useState<any>([]);
  const [walletPreference, setWalletPreference] = useState<WalletPreference | null>(null);
  const [dfnsToken, setDfnsToken] = useState<string | null>(null);
  const [forceLogout, setForceLogout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // New state for initialization
  //let provider: ethers.providers.Provider | null = null;
  let [provider, setProvider] = useState<ethers.providers.Provider | null>(null);
  // Define the getToken function
  const getToken = async (request: any) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_PARSE_SERVER_URL}/auth/login`, request);
      const data = response.data;
      return {
        walletPreference: data?.user?.walletPreference,
        token: data?.access_token || "",
        roles: data?.user?.roles || [],
        user: data?.user,
        dfnsToken: data?.dfns_token,
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

  // Abstracted function to initialize BlockchainService
  const initializeBlockchainService = (provider: ethers.providers.Provider) => {
    console.log("Initializing BlockchainService...");
    const _blockchainService = new BlockchainService(
      provider,
      process.env.REACT_APP_HARDHAT_CONTRACT_ADDRESS || "",
      process.env.REACT_APP_HARDHAT_IDENTITY_FACTORY_ADDRESS || ""
    );
    setBlockchainService(_blockchainService);
  };

  const onConnect = async (address: any, connector: any) => {
    if (isConnected) {
      return;
    }

    const provider = new ethers.providers.Web3Provider((window as any).ethereum);
    const RandomString = generateRandomString(10);
    const message = `Sign this message to validate that you are the owner of the account. Random string: ${RandomString}`;
    const signer = provider.getSigner();

    let signature;
    try {
      signature = await signer.signMessage(message);
    } catch (error: any) {
      const message = error.reason ? error.reason : error.message;
      toast.error(message);
      setForceLogout(true);
      return;
    }

    const { token, roles, walletPreference, dfnsToken }: any = await getToken({
      message: message,
      signature: signature,
    });

    if (roles.length > 0) {
      setRole([...roles]);
      setUser(user);
      setWalletPreference(walletPreference);
      setDfnsToken(dfnsToken);
      localStorage.setItem("sessionToken", token);
    } else {
      if (signature) {
        toast.error("Sorry you are not authorized!");
        setForceLogout(true);
      }
    }

    const network = await provider.getNetwork();
    const chainId = network.chainId;
    const configChainId = Number(process.env.REACT_APP_HARDHAT_CHAIN_ID) || 0;

    if (!configChainId || configChainId !== chainId) {
      setIsConnected(false);
      return;
    }

    setIsConnected(true);

    initializeBlockchainService(provider);
    // Initialize Parse
    parseInitialize();
  };

  // Define the onLogout function for email/password login
  const onLogoutEmailPassword = async () => {
    try {
      const token = localStorage.getItem("sessionToken");
      if (token) {
        // Invalidate the session token on the server
        await axios.post(
          `${process.env.REACT_APP_PARSE_SERVER_URL}/auth/logout`,
          {},
          {
            headers: {
              "x-parse-session-token": token,
            },
          }
        );
      }
    } catch (error) {
      console.error("Error during logout:", error);
      toast.error("Error during logout. Please try again.");
      return;
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

    toast.success("Logged out successfully.");
  };

  // Define the onLogin function (Username/Password Login)
  const onLogin = async (email: string, password: string) => {
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
      //const provider = await setupProvider();
      if (!provider) {
        console.error("❌ Failed to initialize provider.");
        toast.error("Could not initialize provider. Please try again.");
        return;
      }

      console.log("✅ Provider initialized:", provider);
      initializeBlockchainService(provider);

      // Initialize Parse
      parseInitialize();
    } else {
      toast.error("Incorrect username / password");
      setForceLogout(true);
    }
  };

  useEffect(() => {
    setupProvider().then(setProvider);
  }, []);

  async function setupProvider(): Promise<ethers.providers.Provider | null> {
    let newProvider: ethers.providers.Provider | null = null;
    console.log("🔍 Checking for wallet provider...");

    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        console.log("🟢 Requesting wallet connection...");
        await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        console.log("🟢 Wallet connected! Using Web3 provider...");
        newProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      } catch (error) {
        console.error("❌ Wallet connection error:", error);
      }
    }

    if (!newProvider) {
      const rpcUrl = process.env.REACT_APP_RPC_URL;
      if (rpcUrl) {
        console.log("⚠️ No wallet detected. Using RPC provider instead:", rpcUrl);
        newProvider = new ethers.providers.StaticJsonRpcProvider(rpcUrl);
        if (newProvider instanceof ethers.providers.StaticJsonRpcProvider) {
          newProvider.polling = false;
          newProvider._pollingInterval = Infinity;
        }
      }
    }

    if (newProvider) {
      setProvider(newProvider);
      return newProvider;
    }

    console.error("❌ No provider available! Please connect a wallet or set an RPC URL.");
    return null;
  }

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
  };

  useEffect(() => {
    if (provider && isConnected) {
      initializeBlockchainService(provider);
    }
  }, [provider, isConnected]);

  if (initializing) {
    return (
      <div className="z-50 h-screen w-screen flex justify-center items-center">
        <Spin />
      </div>
    );
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        <RoleContext.Provider value={{ role, setRole, walletPreference, setWalletPreference, dfnsToken, setDfnsToken, user, setUser }}>
          {/* Loading Spinner Overlay */}
          {loading && (
            <div className="z-50 h-screen w-screen overflow-hidden absolute top-0 left-0 flex justify-center items-center bg-[#00000040]">
              <Spin />
            </div>
          )}
          <Router>
            <AutoLogout />
            {/* Navigation Bar (Only visible when logged in) */}
            {role.length > 0 && (
              <div className={`topnav p-0`}>
                <NavBar onConnect={onConnect} onDisconnect={onDisconnect} onLogout={onLogoutEmailPassword} role={role} />
              </div>
            )}

            <Layout>
              <div className={`${role.length === 0 ? "p-0 -ml-4 overflow-hidden" : "content"}`}>
                <ToastContainer
                  position="top-right"
                  className="toast-background"
                  progressClassName="toast-progress-bar"
                  autoClose={4000}
                  closeOnClick
                  pauseOnHover
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
                      />
                    }
                  />
                  <Route path="/create-password/:token" element={<CreatePassword service={blockchainService} />} />

                  <Route
                    path="/topics"
                    element={
                      <Protected role={"CentralAuthority"} roles={role}>
                        {blockchainService ? (
                          <ClaimTopicsPage service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/topics/create"
                    element={
                      <Protected role={"CentralAuthority"} roles={role}>
                        {blockchainService ? (
                          <CreateClaimTopic service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/topics/:topicId"
                    element={
                      <Protected role={"CentralAuthority"} roles={role}>
                        {blockchainService ? (
                          <ViewClaimTopic service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/issuers"
                    element={
                      <Protected role={"CentralAuthority"} roles={role}>
                        {blockchainService ? (
                          <TrustedIssuersPage service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/issuers/create"
                    element={
                      <Protected role={"CentralAuthority"} roles={role}>
                        {blockchainService ? (
                          <CreateTrustedIssuer service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/issuers/:issuerId"
                    element={
                      <Protected role={"CentralAuthority"} roles={role}>
                        {blockchainService ? (
                          <CreateTrustedIssuer service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/identities"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        {blockchainService ? (
                          <IdentitiesPage service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/identities/create"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        {blockchainService ? (
                          <CreateDigitalId service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/identities/:identityId/:userId?"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        {blockchainService ? (
                          <DigitalIdentityDetailView service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/identities/:identityId/edit"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        {blockchainService ? (
                          <EditClaims service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/identities/:identity/edit/summary"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        {blockchainService ? (
                          <EditClaimsSummaryView service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                  <Route
                    path="/mint"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        {blockchainService ? (
                          <MintPage service={blockchainService} />
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <Spin tip="Initializing service..." />
                          </div>
                        )}
                      </Protected>
                    }
                  />
                </Routes>
              </div>
            </Layout>
          </Router>
        </RoleContext.Provider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
