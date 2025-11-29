import React, { useContext } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, useLocation } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";

import NomyxLogo from "../assets/nomyx_logo_white.svg"; // Using white logo for dark sidebar
import { RoleContext } from "../context/RoleContext";
import { WalletPreference } from "../utils/Constants";

const SidebarItem = ({ to, label, icon, dataTour }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <li>
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
          isActive ? "bg-white/10 text-white shadow-sm border border-white/5" : "text-slate-400 hover:text-white hover:bg-white/5 hover:pl-5"
        }`}
        data-tour={dataTour}
      >
        {icon && (
          <span
            className={`w-5 h-5 transition-colors duration-200 ${isActive ? "text-[var(--color-accent)]" : "text-slate-500 group-hover:text-white"}`}
          >
            {icon}
          </span>
        )}
        <span>{label}</span>
      </Link>
    </li>
  );
};

const Sidebar = ({ onConnect, onDisconnect, onLogout, role }) => {
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
    <aside className="fixed top-0 left-0 h-full w-64 bg-[#0F172A] border-r border-slate-800 z-50 flex flex-col">
      {/* Header / Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-[#0B1120]">
        <Link to="/" className="flex items-center gap-2">
          <img src={NomyxLogo} alt="Nomyx Logo" className="h-7 w-auto" />
          <span className="text-white font-semibold tracking-tight text-lg">NomyxID</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <ul className="space-y-1">
          {role.includes("CentralAuthority") && (
            <>
              <SidebarItem
                to="/"
                label="Dashboard"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                    />
                  </svg>
                }
              />

              <li className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Compliance Management</li>

              <SidebarItem
                to="/topics"
                label="Compliance Rules"
                dataTour="nav-compliance-rules"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                    />
                  </svg>
                }
              />
              <SidebarItem
                to="/issuers"
                label="Trusted Issuers"
                dataTour="nav-trusted-issuers"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                    />
                  </svg>
                }
              />
            </>
          )}

          {role.includes("TrustedIssuer") && (
            <SidebarItem
              to="/identities"
              label="Identities"
              dataTour="nav-identities"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                  />
                </svg>
              }
            />
          )}

          {role.includes("CentralAuthority") && (
            <>
              <li className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">External</li>

              <li>
                <a
                  href={process.env.REACT_APP_MINTIFY_UI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                >
                  <span className="w-5 h-5 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </span>
                  Mint Portal
                </a>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* User / Wallet Footer */}
      <div className="p-4 border-t border-slate-800 bg-[#0B1120]">
        <div className="flex flex-col gap-3">
          {walletPreference === WalletPreference.PRIVATE && (
            <div className="transform scale-95 origin-left">
              <ConnectButton />
            </div>
          )}

          {walletPreference === WalletPreference.MANAGED && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-all border border-slate-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                />
              </svg>
              Sign Out
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
