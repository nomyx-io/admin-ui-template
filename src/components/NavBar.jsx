import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";

import NomyxLogo from "../images/nomyx.svg";
import "@rainbow-me/rainbowkit/styles.css";

const NavBar = ({ onConnect, onDisconnect, role }) => {
  const { disconnect } = useDisconnect();

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
              <span>
                <a
                  href="https://kronos-mintify-ui.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center"
                >
                  Mint
                  <span className="text-[#7F56D9]">↗</span>
                </a>
              </span>
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
        <li style={{ marginLeft: "auto" }}>
          <ConnectButton />
        </li>
      </ul>
    </nav>
  );
};

export default NavBar;
