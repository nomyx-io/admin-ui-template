import { useContext, useEffect, useState, useRef } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";

import styles from "./LoginPage.module.css";
import { RoleContext } from "../App";
import logoDark from "../assets/nomyx_logo_dark.png";
import logoLight from "../assets/nomyx_logo_light.png";
import bg from "../images/BlackPaintBackground.webp";
import logo from "../images/NomyxLogoWhite.svg";

export default function Login({ forceLogout, service, onConnect, onDisconnect }) {
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
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Left Side */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 md:px-6 my-10">
            <div className="w-full max-w-2xl">
              <img src={logoLight} alt="Logo" width={630} height={240} priority className="block dark:hidden" />
              <img src={logoDark} alt="Logo" width={630} height={240} priority className="hidden dark:block" />
            </div>
          </div>

          <div className="max-[550px]:hidden w-1/2 flex flex-col justify-center items-center p-2">
            {/* The heading at the top */}
            <h1 className="text-right font-bold text-xl mb-4 w-full mt-8 mr-4">CARBON CREDIT MANAGER</h1>
            {/* The container that will hold the button in the middle */}

            <div className="flex-grow flex items-center justify-center">
              <div className="bg-[#3E81C833] shadow-lg rounded-lg p-10 max-w-2xl items-center justify-center login-div">
                <ConnectButton label="Log in with Wallet" onConnect={handleConnect} onDisconnect={handleDisconnect} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
