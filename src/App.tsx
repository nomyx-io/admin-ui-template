import "react-toastify/dist/ReactToastify.css";

import { useEffect, useState, createContext } from "react";

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
import CreateTrustedIssuer from "./components/CreateTrustedIssuer.jsx";
import DigitalIdentityDetailView from "./components/DigitalIdentityDetailPage.jsx";
import EditClaims from "./components/EditClaims.jsx";
import EditClaimsSummaryView from "./components/EditClaimsSummaryView.jsx";
import Home from "./components/Home.jsx";
import IdentitiesPage from "./components/IdentitiesPage.jsx";
import Layout from "./components/Layout";
import Login from "./components/LoginPage.jsx";
import NavBar from "./components/NavBar.jsx";
import Protected from "./components/Protected";
import TrustedIssuersPage from "./components/TrustedIssuersPage.jsx";
import ViewClaimTopic from "./components/ViewClaimTopic";
import BlockchainService from "./services/BlockchainService.js";
import { generateRandomString } from "./utils";

export const RoleContext = createContext({});

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
  [base, baseSep, localhost], // mainnet, polygon, optimism, arbitrum, zora,
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

    console.log("Response", response);
    const data = response.data;
    console.log("Response Data", data);
    return {
      valid: data?.valid || false,
      roles: data?.user?.roles || [],
    };
  } catch (error) {
    console.error("Error validating token:", error);
    return {
      valid: false,
      roles: [],
    };
  }
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [blockchainService, setBlockchainService] = useState<BlockchainService | null>(null);
  const [role, setRole] = useState<any>([]);
  const [forceLogout, setForceLogout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // New state for initialization

  const onConnect = async (address: any, connector: any) => {
    if (isConnected) {
      return;
    }

    const provider = new ethers.providers.Web3Provider((window as any).ethereum);
    const RandomString = generateRandomString(10);
    const message = `Sign this message to validate that you are the owner of the account. Random string: ${RandomString}`;
    const signer = await provider.getSigner();
    let signature;
    try {
      signature = await signer.signMessage(message);
    } catch (error: any) {
      const message = error.reason ? error.reason : error.message;
      toast.error(message);
      setForceLogout(true);
    }
    const { token, roles }: any = await getToken({
      message: message,
      signature: signature,
    });
    if (roles.length > 0) {
      setRole([...roles]);
      localStorage.setItem("sessionToken", token);
    } else if (roles.length === 0) {
      if (signature) {
        toast.error("Sorry You are not Authorized !");
        setForceLogout(true);
      }
    }

    provider.getNetwork().then(async (network: any) => {
      const chainId = network.chainId;

      const config = Number(process.env.REACT_APP_HARDHAT_CHAIN_ID) || 0;

      if (!config || config !== chainId) {
        setIsConnected(false);
        return;
      }

      setIsConnected(true);

      const _blockchainService = new BlockchainService(
        provider,
        process.env.REACT_APP_HARDHAT_CONTRACT_ADDRESS,
        process.env.REACT_APP_HARDHAT_IDENTITY_FACTORY_ADDRESS
      );
      setBlockchainService(_blockchainService);
    });
  };

  const getToken = async (request: any) => {
    try {
      let data: any = await axios.post(`${process.env.REACT_APP_PARSE_SERVER_URL}/auth/login`, request);
      console.log("Token Data", data);
      data = data.data;
      return {
        token: data?.access_token || "",
        roles: data?.user?.roles || [],
      };
    } catch (error) {
      console.log("Error", error);
      return {
        token: "",
        roles: [],
      };
    }
  };

  const restoreSession = async () => {
    const token = localStorage.getItem("sessionToken");
    if (token) {
      const { valid, roles } = await validateToken(token);
      console.log("Valid", valid);
      console.log("Roles", roles);
      if (valid && roles.length > 0) {
        setRole(roles);
        setIsConnected(true);
      } else {
        // Token is invalid or roles are empty
        localStorage.removeItem("sessionToken");
        localStorage.removeItem("userRoles");
        setForceLogout(true);
      }
    }
    setInitializing(false);
  };

  useEffect(() => {
    console.log("Restoring session");
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setForceLogout(false);
    setIsConnected(false);
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("userRoles");
  };

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
        <RoleContext.Provider value={{ role, setRole }}>
          {loading && (
            <div className="z-50 h-screen w-screen overflow-hidden absolute top-0 left-0 flex justify-center items-center bg-[#00000040]">
              <Spin />
            </div>
          )}
          <Router>
            {role.length > 0 && (
              <div className={`topnav p-0`}>
                <NavBar onConnect={onConnect} onDisconnect={onDisconnect} role={role} />
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
                    element={<Login forceLogout={forceLogout} onConnect={onConnect} onDisconnect={onDisconnect} service={blockchainService} />}
                  />
                  <Route
                    path="/topics"
                    element={
                      <Protected role={"CentralAuthority"} roles={role}>
                        {" "}
                        <ClaimTopicsPage service={blockchainService} />{" "}
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
                        <IdentitiesPage service={blockchainService} />
                      </Protected>
                    }
                  />
                  <Route
                    path="/identities/create"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        <CreateDigitalId service={blockchainService} />
                      </Protected>
                    }
                  />
                  <Route
                    path="/identities/:identityId/:userId?"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        <DigitalIdentityDetailView service={blockchainService} />
                      </Protected>
                    }
                  />
                  <Route
                    path="/identities/:identityId/edit"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        <EditClaims service={blockchainService} />
                      </Protected>
                    }
                  />
                  <Route
                    path="/identities/:identity/edit/summary"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        <EditClaimsSummaryView service={blockchainService} />
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
