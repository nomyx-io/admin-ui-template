import React, { useContext } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, useLocation } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";

import NomyxLogo from "../assets/nomyx_logo_black.svg";
import { RoleContext } from "../context/RoleContext";
import { WalletPreference } from "../utils/Constants";
import "@rainbow-me/rainbowkit/styles.css";

const NavItem = ({ to, label, dataTour }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <li>
      <Link
        to={to}
        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
          isActive ? "bg-gray-100 text-[var(--color-accent)]" : "text-[var(--text-secondary)] hover:text-[var(--color-primary)] hover:bg-gray-50"
        }`}
        data-tour={dataTour}
      >
        {label}
      </Link>
    </li>
  );
};

const NavBar = ({ onConnect, onDisconnect, onLogout, role }) => {
  const { walletPreference } = useContext(RoleContext);
  const { disconnect } = useDisconnect();

  const handleLogout = () => {
    if (walletPreference === WalletPreference.MANAGED) {
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
              <img src={NomyxLogo} alt="Nomyx Logo" className="h-8 w-auto" />
            </li>
            <NavItem to="/" label="Home" />
            <li>
              <a href={process.env.REACT_APP_MINTIFY_UI_URL} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
                Mint
                <span className="text-[#7F56D9]">↗</span>
              </a>
            </li>
            <NavItem to="/topics" label="Compliance Rules" dataTour="nav-compliance-rules" />
            <NavItem to="/issuers" label="Trusted Issuers" dataTour="nav-trusted-issuers" />
          </>
        )}
        {role.includes("TrustedIssuer") && <NavItem to="/identities" label="Identities" dataTour="nav-identities" />}

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
