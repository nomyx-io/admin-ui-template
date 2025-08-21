import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import { Spin, Layout, Card, Radio, Form, Input, Button, Space, message } from "antd";
import Badge from "antd/es/badge";
import Tooltip from "antd/es/tooltip";
import Select from "antd/es/select";
import Modal from "antd/es/modal";
import { toast } from "react-toastify";
import { createBlockchainSelectionManager } from "@nomyx/shared";
import { LoginPreference } from "./types";

export interface LoginPageProps {
  // Branding
  logoLight?: string;
  logoDark?: string;
  appName?: string;
  backgroundImage?: string;
  
  // Authentication handlers
  onLogin: (email: string, password: string) => Promise<void>;
  onConnect?: (address: string, provider: any) => Promise<void>;
  onDisconnect?: () => void;
  onNavigate: (path: string, replace?: boolean) => void;
  
  // Blockchain configuration
  service?: any;
  selectedChainId?: string;
  onChainChange?: (chainId: string) => void;
  
  // User state
  role?: string | string[];
  forceLogout?: boolean;
  
  // UI customization
  showSignUpLink?: boolean;
  signUpPath?: string;
  showForgotPassword?: boolean;
  forgotPasswordPath?: string;
  loginPreferences?: LoginPreference[];
  defaultLoginPreference?: LoginPreference;
  
  // Role-based redirects
  roleRedirects?: Record<string, string>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  logoLight,
  logoDark,
  appName = "NomyxID",
  backgroundImage = "/images/nomyx_banner.svg",
  onLogin,
  onConnect,
  onDisconnect,
  onNavigate,
  service,
  selectedChainId,
  onChainChange,
  role,
  forceLogout,
  showSignUpLink = false,
  signUpPath = "/signup",
  showForgotPassword = false,
  forgotPasswordPath = "/forgot-password",
  loginPreferences = [LoginPreference.USERNAME_PASSWORD, LoginPreference.WALLET],
  defaultLoginPreference = LoginPreference.USERNAME_PASSWORD,
  roleRedirects = {
    CentralAuthority: "/",
    TrustedIssuer: "/identities",
  },
}) => {
  const [loginPreference, setLoginPreference] = useState(defaultLoginPreference);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnectTriggered, setIsConnectTriggered] = useState(false);
  const previousRole = useRef(role);

  // State for wallet connection
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAccount, setWalletAccount] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<any>(null);

  // Handle role-based navigation
  useEffect(() => {
    if (previousRole.current !== role && role) {
      let newRedirectionUrl = "/";

      // Check role redirects
      if (typeof role === "string" && roleRedirects[role]) {
        newRedirectionUrl = roleRedirects[role];
      } else if (Array.isArray(role)) {
        // For multiple roles, find the first matching redirect
        for (const r of role) {
          if (roleRedirects[r]) {
            newRedirectionUrl = roleRedirects[r];
            break;
          }
        }
      }

      onNavigate(newRedirectionUrl, true);
      previousRole.current = role;
    }
  }, [role, onNavigate, roleRedirects]);

  // Handle force logout
  useEffect(() => {
    if (forceLogout) {
      setIsConnected(false);
      setIsConnectTriggered(false);
      setWalletConnected(false);
      setWalletAccount(null);
      setWalletProvider(null);
    }
  }, [forceLogout]);

  // Handle standard login form submission
  const handleStandardLogin = async (values: any) => {
    const { email, password } = values;
    try {
      await onLogin(email, password);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please check your credentials.");
    }
  };

  // Handle wallet connection from BlockchainSelectionManager
  const handleWalletConnect = (account: string, provider: any) => {
    console.log("Wallet connected:", { account, provider });
    setWalletConnected(true);
    setWalletAccount(account);
    setWalletProvider(provider);
  };

  // Handle wallet disconnection
  const handleWalletDisconnect = () => {
    console.log("Wallet disconnected");
    setWalletConnected(false);
    setWalletAccount(null);
    setWalletProvider(null);
  };

  // Handle SmartWallet login
  const handleSmartWalletConnect = async () => {
    if (!walletConnected || !walletAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!onConnect) {
      toast.error("Wallet connection not configured");
      return;
    }

    console.log("SmartWallet connection with:", {
      account: walletAccount,
      provider: walletProvider,
      chain: selectedChainId,
    });

    if (!isConnectTriggered) {
      console.log("Connect Triggered");
      setIsConnectTriggered(true);
      setIsConnected(true);
      // Pass wallet info to the parent component
      await onConnect(walletAccount, walletProvider);
    }
  };

  const handleDisconnect = () => {
    setIsConnectTriggered(false);
    setIsConnected(false);
    setWalletConnected(false);
    setWalletAccount(null);
    setWalletProvider(null);
    if (onDisconnect) {
      onDisconnect();
    }
    onNavigate("/", true);
  };

  const showWalletOption = loginPreferences.includes(LoginPreference.WALLET);
  const showStandardOption = loginPreferences.includes(LoginPreference.USERNAME_PASSWORD);

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden flex flex-col"
      style={{
        backgroundImage: `url('${backgroundImage}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {isConnected ? (
        <div className="flex flex-1 flex-col lg:flex-row items-center justify-center">
          <Spin />
        </div>
      ) : (
        <>
          {/* Add BlockchainSelectionManager at the top-right */}
          {selectedChainId && onChainChange && (
            <div 
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                marginTop: "1em",
                marginRight: "calc((100vw - 550px) / 2)", // Aligns with login card's right edge
              }}
            >
              {(() => {
                const BSM = useMemo(() => createBlockchainSelectionManager(React, {
                  useState, useEffect, useCallback: React.useCallback, useRef,
                  Select, Button, Card, Space, message, Modal, Tooltip, Badge
                }) as React.ComponentType<any>, []);
                return <BSM
                selectedChainId={selectedChainId}
                onChainChange={onChainChange}
                onWalletConnect={handleWalletConnect}
                onWalletDisconnect={handleWalletDisconnect}
                className=""
                showNetworkInfo={true}
                showConnectButton={true}
              />
              })()}
            </div>
          )}

          
          <div className="flex flex-1 flex-col lg:flex-row">
            {/* Left Side - Logo */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 md:px-6 my-10">
              <div className="w-full max-w-2xl flex justify-center">
                {logoDark ? (
                  <img src={logoDark} alt="Logo" style={{ maxWidth: "400px", width: "100%", height: "auto" }} />
                ) : (
                  <img src="/images/nomyx_logo_white.svg" alt="Nomyx Logo" style={{ maxWidth: "400px", width: "100%", height: "auto" }} />
                )}
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-2">

              {/* Login Card Container */}
              <div className="w-full lg:w-3/4 flex items-center justify-center px-4 md:px-6">
                <div 
                  className="shadow-lg rounded-lg p-6 max-w-2xl w-full"
                  style={{
                    backgroundColor: "rgba(20, 20, 20, 0.95)",
                    color: "rgba(255, 255, 255, 0.85)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="w-full flex flex-col justify-center items-center">
                    <Card
                      title={
                        <div style={{ 
                          backgroundColor: "transparent",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
                          marginBottom: "16px"
                        }}>
                          <span style={{ color: "white", fontSize: "20px", fontWeight: 600 }}>{appName} - Sign In</span>
                        </div>
                      }
                      style={{
                        width: "100%",
                        maxWidth: "550px",
                        border: "none",
                        backgroundColor: "transparent",
                      }}
                      styles={{
                        header: {
                          backgroundColor: "transparent",
                          border: "none",
                          padding: "0",
                        },
                        body: {
                          padding: "24px 0 0 0",
                        }
                      }}
                      className="signup-card wallet-setup-radio-group"
                      extra={
                        loginPreferences.length > 1 && (
                          <Radio.Group value={loginPreference} onChange={(e: any) => setLoginPreference(e.target.value)} buttonStyle="solid">
                            {showStandardOption && (
                              <Radio.Button value={LoginPreference.USERNAME_PASSWORD} className="login-radio-button">
                                Standard
                              </Radio.Button>
                            )}
                            {showWalletOption && (
                              <Radio.Button value={LoginPreference.WALLET} className="login-radio-button">
                                SmartWallet
                              </Radio.Button>
                            )}
                          </Radio.Group>
                        )
                      }
                    >
                      {loginPreference === LoginPreference.USERNAME_PASSWORD ? (
                        <Form layout="vertical" onFinish={handleStandardLogin} className="w-full" initialValues={{ email: "", password: "" }}>
                          <Form.Item
                            name="email"
                            label={<span style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "14px" }}>Email</span>}
                            rules={[
                              {
                                required: true,
                                message: "Please input your Email!",
                                type: "email",
                              },
                            ]}
                          >
                            <Input 
                              type="email" 
                              placeholder="Enter your email" 
                              style={{
                                backgroundColor: "white",
                                border: "1px solid #d9d9d9",
                                color: "black",
                                height: "40px",
                                borderRadius: "6px",
                              }}
                            />
                          </Form.Item>

                          <Form.Item
                            name="password"
                            label={<span style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "14px" }}>Password</span>}
                            rules={[
                              {
                                required: true,
                                message: "Please input your Password!",
                              },
                            ]}
                          >
                            <Input
                              type="password"
                              placeholder="Enter your password"
                              style={{
                                backgroundColor: "white",
                                border: "1px solid #d9d9d9",
                                color: "black",
                                height: "40px",
                                borderRadius: "6px",
                              }}
                            />
                          </Form.Item>

                          <Form.Item>
                            <div className="flex justify-end">
                              <Button 
                                type="primary" 
                                htmlType="submit" 
                                style={{
                                  backgroundColor: "#4096ff",
                                  border: "none",
                                  height: "40px",
                                  fontSize: "16px",
                                  fontWeight: 500,
                                  borderRadius: "6px",
                                  width: "100%",
                                }}
                              >
                                Log in
                              </Button>
                            </div>
                          </Form.Item>

                          {showForgotPassword && (
                            <div className="flex justify-between">
                              <a 
                                href={forgotPasswordPath} 
                                style={{ 
                                  color: "#4096ff", 
                                  fontWeight: "600",
                                  textDecoration: "none",
                                  fontSize: "14px"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                              >
                                Forgot Password?
                              </a>
                            </div>
                          )}
                        </Form>
                      ) : (
                        <div className="flex flex-col items-center space-y-4">
                          <div className="text-center">
                            <p style={{ color: "rgba(255, 255, 255, 0.65)", marginBottom: "16px" }}>
                              Select a blockchain and connect your wallet above
                            </p>
                            {walletConnected && (
                              <div style={{
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                borderRadius: "8px",
                                padding: "12px",
                                marginBottom: "16px",
                                border: "1px solid rgba(255, 255, 255, 0.1)"
                              }}>
                                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", marginBottom: "4px" }}>
                                  Connected Account:
                                </p>
                                <p style={{ color: "white", fontFamily: "monospace", fontSize: "14px", marginBottom: "4px" }}>
                                  {walletAccount}
                                </p>
                                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", marginTop: "4px" }}>
                                  Chain: {selectedChainId}
                                </p>
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={handleSmartWalletConnect}
                            style={{
                              backgroundColor: walletConnected ? "#4096ff" : "rgba(255, 255, 255, 0.1)",
                              border: "none",
                              color: walletConnected ? "white" : "rgba(255, 255, 255, 0.4)",
                              height: "40px",
                              fontSize: "16px",
                              fontWeight: 500,
                              cursor: walletConnected ? "pointer" : "not-allowed",
                            }}
                            size="large"
                            disabled={!walletConnected}
                          >
                            Connect
                          </Button>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LoginPage;

