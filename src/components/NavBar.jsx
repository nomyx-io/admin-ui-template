import React, { useContext } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAccount, useDisconnect } from "wagmi";

import { RoleContext } from "../context/RoleContext";
import NomyxLogo from "../images/nomyx.svg";
import { WalletPreference } from "../utils/Constants";

import "@rainbow-me/rainbowkit/styles.css";

const NavBar = ({ onConnect, onDisconnect, onLogout, role }) => {
  const { walletPreference } = useContext(RoleContext);
  const { disconnect } = useDisconnect();

  console.log("Role: ", role);
  console.log("Wallet Preference: ", walletPreference);

  // Handle logout based on wallet preference
  const handleLogout = () => {
    if (walletPreference === WalletPreference.MANAGED) {
      console.log("Logging out username and password");
      // Logout for wallet-based login
      onLogout();
    }
  };

  useAccount({
    onDisconnect: function () {
      disconnect();
      onDisconnect();
    },
  });

  return (
    <nav className="bg-white text-black p-6">
      <ul className="flex space-x-6">
        {role.includes("CentralAuthority") && (
          <>
            <li style={{ padding: "20px 20px", minWidth: "100px" }}>
              <img src={NomyxLogo} alt="Nomyx Logo" className="h-6 w-auto" />
            </li>
            <li>
              <Link to="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li>
              <Link to="/mint" className="hover:underline">
                Mint
              </Link>
            </li>
            <li>
              <Link to="/topics" className="hover:underline">
                Claim Topics
              </Link>
            </li>
            <li>
              <Link to="/issuers" className="hover:underline">
                Trusted Issuers
              </Link>
            </li>
          </>
        )}
        {role.includes("TrustedIssuer") && (
          <li>
            <Link to="/identities" className="hover:underline">
              Identities
            </Link>
          </li>
        )}

        {walletPreference === WalletPreference.PRIVATE && (
          <li style={{ marginLeft: "auto" }}>
            <ConnectButton />
          </li>
        )}

        {walletPreference === WalletPreference.MANAGED && (
          <li style={{ marginLeft: "auto" }}>
            <button onClick={handleLogout} className="bg-black text-white px-4 py-2 rounded-md">
              Logout
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default NavBar;
