import "react-toastify/dist/ReactToastify.css";

//dependencies
import React, { useEffect, useState, createContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ethers } from "ethers";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig, Chain } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import axios from "axios";

//component dependencies
import { Spin } from "antd";
import { ToastContainer, toast } from "react-toastify";

//local infrastucture
import BlockchainService from "./services/BlockchainService.js";
import TestService from "./services/TestService";
import Protected from "./components/Protected";
import Layout from "./components/Layout";
import NavBar from "./components/NavBar.jsx";
import { generateRandomString } from "./utils";

//views
import Login from "./components/LoginPage.jsx";
import Home from "./components/Home.jsx";
import ClaimTopicsPage from "./components/ClaimTopicsPage.jsx";
import CreateClaimTopic from "./components/CreateClaimTopic.jsx";
import ViewClaimTopic from "./components/ViewClaimTopic";
import TrustedIssuersPage from "./components/TrustedIssuersPage.jsx";
import CreateTrustedIssuer from "./components/CreateTrustedIssuer.jsx";
import IdentitiesPage from "./components/IdentitiesPage.jsx";
import CreateDigitalId from "./components/CreateDigitalId.jsx";
import DigitalIdentityDetailView from "./components/DigitalIdentityDetailPage.jsx";
import EditClaims from "./components/EditClaims.jsx";
import EditClaimsSummaryView from "./components/EditClaimsSummaryView.jsx";
import ClaimsPage from "./components/ClaimsPage.jsx";

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

const baseSep: any = {
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
      http: [process.env.REACT_APP_NETWORK_BASE_SEPOLIA],
    },
    public: {
      http: [process.env.REACT_APP_NETWORK_BASE_SEPOLIA],
    },
  },
};

const base: any = {
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
      http: [process.env.REACT_APP_NETWORK_BASE],
    },
    public: {
      http: [process.env.REACT_APP_NETWORK_BASE],
    },
  },
};

const { chains, publicClient } = configureChains(
  [base, baseSep, localhost], // mainnet, polygon, optimism, arbitrum, zora,
  [
    alchemyProvider({ apiKey: "CSgNtTJ6_Clrf1zNjVp2j1ppfLE2-aVX" }),
    publicProvider(),
  ]
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

/*function UnsupportedNetworkDialog(props: any) {

  const { currentNetwork, supportedNetworks, visible, onClose, onSwitchNetwork } = props;

  if (!visible) {
    return null;
  }

  const handleClose = () => {
    onClose();
  }

  const handleSwitchNetwork = () => {
    onSwitchNetwork();
  }

  return (
    <div className="dialog">
      <div className="dialog-content">
        <div className="dialog-header">
          <h2>Unsupported Network</h2>
        </div>
        <div className="dialog-body">
          <p>
            You are currently connected to <strong>{currentNetwork}</strong> which is not supported by this application.
          </p>
          <p>
            Please switch to one of the following supported networks:
          </p>
          <ul>
            {supportedNetworks.map((network: any) => {
              return (
                <li key={network.chainId}>
                  <button onClick={handleSwitchNetwork}>{network.name}</button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="dialog-footer">
          <button onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  );
}*/

function App() {
  const [isConnected, setIsConnected] = React.useState(false);
  const [currentNetwork, setCurrentNetwork] = React.useState(0);
  const [blockchainService, setBlockchainService] = React.useState(
    new TestService()
  );
  // const [unsupportedNetworkDialogVisible, setUnsupportedNetworkDialogVisible] = React.useState(false);
  const [role, setRole] = useState<any>([]);
  const [forceLogout, setForceLogout] = useState(false);
  const [loading, setLoading] = useState(false);

  const onConnect = async (address: any, connector: any) => {
    if (isConnected) {
      return;
    }

    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum
    );
    let RandomString = generateRandomString(10);
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
    const publicAddress = await signer.getAddress();
    let { token, roles }: any = await getToken({
      message: message,
      signature: signature,
    });
    if (roles.length > 0) {
      setRole([...roles]);
      localStorage.setItem("sessionToken", token);
    } else if (roles.length == 0) {
      if (signature) {
        toast.error("Sorry You are not Authorized !");
        setForceLogout(true);
      }
    }

    const network = provider.getNetwork().then(async (network: any) => {
      const chainId = network.chainId;
      setCurrentNetwork(network.chainId);

      const config = process.env.REACT_APP_HARDHAT_CHAIN_ID || "";

      if (!config || config != chainId) {
        // setUnsupportedNetworkDialogVisible(true);
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
      let data: any = await axios.post(
        `${process.env.REACT_APP_PARSE_SERVER_URL}/auth/login`,
        request
      );
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
  };

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
            {/* Navigation Menu */}
            {/*					<UnsupportedNetworkDialog
						currentNetwork={currentNetwork}
						supportedNetworks={[
							{chainId: 1, name: 'Mainnet'},
							{chainId: 4, name: 'Rinkeby'},
							{chainId: 3, name: 'Ropsten'},
							{chainId: 5, name: 'Goerli'},
							{chainId: 42, name: 'Kovan'},
						]}
						visible={unsupportedNetworkDialogVisible}
						onClose={() => {}}
						onSwitchNetwork={() => {}}
					/>*/}
            {role.length > 0 && (
              <div className={`topnav p-0`}>
                <NavBar
                  /*isConnected={isConnected}
							connectBlockchain={async () => {
								if ((window as any).ethereum) {
									try {
										const provider = new ethers.providers.Web3Provider((window as any).ethereum);
										let jsonConfig: any = await import(`./config.json`);

										const network = await provider.getNetwork();
										const chainId = network.chainId;
										const config = jsonConfig[chainId];

										setCurrentNetwork(network.chainId);
										if (!config) {
											// setUnsupportedNetworkDialogVisible(true);
											setIsConnected(false);
											return;
										}

										setIsConnected(true);

										const _blockchainService = new BlockchainService(provider, config.contract);
										setBlockchainService(_blockchainService);
									} catch (err) {
										console.log(err);
									}
								} else {
									console.log('Please install MetaMask!');
								}
							}}
							disconnectBlockchain={() => {
								setIsConnected(false);
							}}*/
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                  role={role}
                />
              </div>
            )}

            <Layout>
              <div
                className={`${
                  role.length == 0 ? "p-0 -ml-4 overflow-hidden" : "content"
                }`}
              >
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
                    element={
                      <Login
                        forceLogout={forceLogout}
                        onConnect={onConnect}
                        onDisconnect={onDisconnect}
                        service={blockchainService}
                      />
                    }
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
                    path="/identities/:identityId"
                    element={
                      <Protected role={"TrustedIssuer"} roles={role}>
                        <DigitalIdentityDetailView
                          service={blockchainService}
                        />
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
