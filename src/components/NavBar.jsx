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
    <nav className="glass-nav sticky top-0 z-50 w-full">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Primary Nav */}
          <div className="flex items-center gap-8">
            {role.includes("CentralAuthority") && (
              <Link to="/" className="flex-shrink-0">
                <img src={NomyxLogo} alt="Nomyx Logo" className="h-8 w-auto opacity-90 hover:opacity-100 transition-opacity" />
              </Link>
            )}

            <ul className="hidden md:flex items-center space-x-1">
              {role.includes("CentralAuthority") && (
                <>
                  <NavItem to="/" label="Home" />
                  <li>
                    <a
                      href={process.env.REACT_APP_MINTIFY_UI_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--color-primary)] hover:bg-gray-50 rounded-md transition-colors flex items-center gap-1"
                    >
                      Mint
                      <span className="text-[var(--color-accent)] text-xs">↗</span>
                    </a>
                  </li>
                  <NavItem to="/topics" label="Compliance Rules" dataTour="nav-compliance-rules" />
                  <NavItem to="/issuers" label="Trusted Issuers" dataTour="nav-trusted-issuers" />
                </>
              )}
              {role.includes("TrustedIssuer") && <NavItem to="/identities" label="Identities" dataTour="nav-identities" />}
            </ul>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {walletPreference === WalletPreference.PRIVATE && (
              <div className="transform scale-90">
                <ConnectButton />
              </div>
            )}

            {walletPreference === WalletPreference.MANAGED && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-md transition-all shadow-sm hover:shadow-md"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
