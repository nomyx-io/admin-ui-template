import { useContext, useEffect, useState, useRef } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Spin, Layout, Card, Radio, Form, Input, Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAccount, useDisconnect } from "wagmi";

import styles from "./LoginPage.module.css";
import { RoleContext } from "../App";
import nomyxLogo from "../Assets/nomyx_logo_white.svg";
import bg from "../images/BlackPaintBackground.webp";
import { LoginPreference } from "../utils/Constants";

// Placeholder for your authentication function
const authenticateUser = async (email, password) => {
  // Replace this with your actual authentication logic
  // For example, call your backend API
  if (email === "test@example.com" && password === "password") {
    return { success: true };
  }
  return { success: false, message: "Invalid credentials" };
};

export default function Login({ forceLogout, onConnect, onDisconnect, onLogin, service }) {
  const [loginPreference, setLoginPreference] = useState(LoginPreference.USERNAME_PASSWORD);
  const navigate = useNavigate();
  const { role } = useContext(RoleContext);
  const { disconnect } = useDisconnect();
  const { isConnected } = useAccount();
  const [isConnectTriggered, setIsConnectTriggered] = useState(false);
  const previousRole = useRef(role);

  useEffect(() => {
    if (previousRole.current !== role) {
      let newRedirectionUrl = "/";

      if (role.includes("CentralAuthority")) {
        newRedirectionUrl = "/";
      } else if (role.includes("TrustedIssuer")) {
        newRedirectionUrl = "/identities";
      }
      navigate(newRedirectionUrl, { replace: true });
      previousRole.current = role;
    }
  }, [role, navigate]);

  useEffect(() => {
    if (forceLogout) {
      disconnect();
    }
  }, [forceLogout, disconnect]);

  // Handle standard login form submission
  const handleStandardLogin = async (values) => {
    const { email, password } = values;
    await onLogin(email, password); // Invoke the onLogin function passed from App
    navigate("/dashboard"); // Redirect after successful login
  };

  const handleConnect = ({ address, connector, isReconnected }) => {
    console.log("Connected with address: ", address);
    if (!isConnectTriggered) {
      console.log("Connect Triggered");
      setIsConnectTriggered(true);
      onConnect(address, connector);
    }
  };

  const handleDisconnect = () => {
    setIsConnectTriggered(false);
    onDisconnect();
    navigate("/", { replace: true }); // Redirect to root path upon disconnect
  };

  useAccount({
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  });

  return (
    <Layout
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className="flex h-full w-full">
        {/* Left Side - Logo */}
        <div
          className={styles.logoContainer + " bg-black hidden sm:flex w-1/2 flex-col justify-center items-center gap-10"}
          style={{ backgroundImage: `url(${bg})` }}
        >
          <img alt="Nomyx Logo" src={nomyxLogo} style={{ width: "75%" }} />
        </div>

        {/* Right Side - Authentication Cards */}
        <div className="w-full sm:w-1/2 flex flex-col justify-center items-center p-4 bg-white">
          <Card
            title={<span className="text-black">Sign In</span>} // Set title color to black
            style={{
              width: "100%",
              maxWidth: "550px",
              border: "1px solid #BBBBBB",
            }}
            className="signup-card bg-white wallet-setup-radio-group"
            extra={
              <Radio.Group value={loginPreference} onChange={(e) => setLoginPreference(e.target.value)} buttonStyle="solid">
                <Radio.Button value={LoginPreference.USERNAME_PASSWORD}>Standard</Radio.Button>
                <Radio.Button value={LoginPreference.WALLET}>Ethereum</Radio.Button>
              </Radio.Group>
            }
          >
            {loginPreference === LoginPreference.USERNAME_PASSWORD ? (
              <Form layout="vertical" onFinish={handleStandardLogin} className="w-full" initialValues={{ email: "", password: "" }}>
                <Form.Item
                  name="email"
                  label={<span className="text-[#1F1F1F]">Email</span>}
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
                      color: "#1F1F1F",
                      backgroundColor: "transparent",
                      border: "1px solid #BBBBBB",
                    }}
                    className="signup-input"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span className="text-[#1F1F1F]">Password</span>}
                  rules={[
                    {
                      required: true,
                      message: "Please input your Password!",
                    },
                  ]}
                >
                  <Input.Password
                    placeholder="Enter your password"
                    style={{
                      color: "#1F1F1F",
                      backgroundColor: "transparent",
                      border: "1px solid #BBBBBB",
                    }}
                    className="signup-input"
                  />
                </Form.Item>

                <Form.Item>
                  <div className="flex justify-end">
                    <Button type="primary" htmlType="submit" className="signup-button">
                      Log in
                    </Button>
                  </div>
                </Form.Item>

                <div className="flex justify-between">
                  <a href="/forgot-password" className="text-blue-600 font-bold">
                    Forgot Password?
                  </a>
                  <div className="text-black font-bold">
                    Need an account?{" "}
                    <a href="/signup" className="text-blue-600">
                      Register here.
                    </a>
                  </div>
                </div>
              </Form>
            ) : (
              <div className="flex flex-col items-center">
                <ConnectButton showBalance={false} />
                <div className="text-black font-bold mt-5">
                  Need an account?{" "}
                  <a href="/signup" className="text-blue-600">
                    Register here.
                  </a>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Loading Spinner Overlay */}
      {isConnected && (
        <div className="z-50 h-full w-full overflow-hidden absolute top-0 left-0 flex justify-center items-center bg-[#00000040]">
          <Spin size="large" />
        </div>
      )}
    </Layout>
  );
}
