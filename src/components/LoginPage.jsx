import { useContext, useEffect, useState, useRef } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Spin, Layout, Card, Radio, Form, Input, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAccount, useDisconnect } from "wagmi";

import logoDark from "../assets/nomyx_logo_dark.png";
import logoLight from "../assets/nomyx_logo_light.png";
import { RoleContext } from "../context/RoleContext";
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
    // navigate("/"); // Redirect after successful login
  };

  const handleConnect = async ({ address, connector, isReconnected }) => {
    console.log("Connected with address: ", address);
    if (!isConnectTriggered) {
      console.log("Connect Triggered");
      setIsConnectTriggered(true);
      await onConnect(address, connector);
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
    <div
      className="relative w-full min-h-screen overflow-hidden flex flex-col"
      style={{
        backgroundImage: "url('/images/nomyx_banner.svg')",
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
          <h1 className="text-right font-bold text-xl mb-4 w-full mt-8 !-ml-10 text-white">NomyxID</h1>
          <div className="flex flex-1 flex-col lg:flex-row">
            {/* Left Side */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 md:px-6 my-10">
              <div className="w-full max-w-2xl">
                <img src={logoDark} alt="Logo" width={630} height={240} priority />
              </div>
            </div>

            <div className="max-[550px]:hidden w-1/2 flex flex-col justify-center items-center p-2">
              {/* The heading at the top */}

              {/* The container that will hold the button in the middle */}

              {/* Right Side */}
              <div className="w-full lg:w-3/4 flex items-center justify-center px-4 md:px-6">
                <div className="bg-nomyxDark1 bg-opacity-90 text-nomyxWhite shadow-lg rounded-lg p-4 max-w-2xl w-full">
                  <div className="w-full flex flex-col justify-center items-center">
                    <Card
                      title={<span className="text-white">Sign In</span>} // Set title color to black
                      style={{
                        width: "100%",
                        maxWidth: "550px",
                        border: "none",
                      }}
                      className="signup-card bg-transparent shadow-lg rounded-lg wallet-setup-radio-group"
                      extra={
                        <Radio.Group value={loginPreference} onChange={(e) => setLoginPreference(e.target.value)} buttonStyle="solid">
                          <Radio.Button value={LoginPreference.USERNAME_PASSWORD} className="login-radio-button">
                            Standard
                          </Radio.Button>
                          <Radio.Button value={LoginPreference.WALLET} className="login-radio-button">
                            Ethereum
                          </Radio.Button>
                        </Radio.Group>
                      }
                    >
                      {loginPreference === LoginPreference.USERNAME_PASSWORD ? (
                        <Form layout="vertical" onFinish={handleStandardLogin} className="w-full" initialValues={{ email: "", password: "" }}>
                          <Form.Item
                            name="email"
                            label={<span className="text-gray-400">Email</span>}
                            rules={[
                              {
                                required: true,
                                message: "Please input your Email!",
                                type: "email",
                              },
                            ]}
                          >
                            <Input type="email" placeholder="Enter your email" className="signup-input placeholder-nomyxGray1 !border-nomyxGray1" />
                          </Form.Item>

                          <Form.Item
                            name="password"
                            label={<span className="text-gray-400">Password</span>}
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
                              className="signup-input placeholder-nomyxGray1 !border-nomyxGray1"
                            />
                          </Form.Item>

                          <Form.Item>
                            <div className="flex justify-end">
                              <Button type="primary" htmlType="submit" className="signup-button">
                                Log in
                              </Button>
                            </div>
                          </Form.Item>

                          {/* <div className="flex justify-between">
      <a href="/forgot-password" className="text-blue-600 font-bold">
        Forgot Password?
      </a>
    </div> */}
                        </Form>
                      ) : (
                        <div className="flex flex-col items-center">
                          <ConnectButton label="Log in with Wallet" showBalance={false} onConnect={handleConnect} onDisconnect={handleDisconnect} />
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
}
