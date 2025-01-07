import { useContext, useEffect, useState, useRef } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";

import styles from "./LoginPage.module.css";
import { RoleContext } from "../App";
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
    <div className="relative h-screen w-screen flex overflow-hidden p-0">
      {isConnected ? (
        <div className="z-50 h-screen w-screen overflow-hidden absolute top-0 left-0 flex justify-center items-center bg-[#00000040]">
          <Spin />
        </div>
      ) : (
        <>
          <div
            className={styles.logoContainer + " bg-black max-[550px]:hidden w-1/2 flex flex-col justify-center items-center gap-10"}
            style={{ backgroundImage: `url(${bg})` }}
          >
            <img alt="LenderLab Logo" src={logo} style={{ width: "75%" }} />
          </div>

          <div className="max-[550px]:hidden w-1/2 flex flex-col justify-center items-center p-2">
            <div className="text-right font-bold text-xl w-full">DID MANAGER</div>
            <div className={styles.btnContainer + " flex flex-grow justify-center items-center align-middle"}>
              <ConnectButton label="Log in with Maisum's Face" onConnect={handleConnect} onDisconnect={handleDisconnect} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
