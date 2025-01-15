import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";

import NomyxLogo from "../Assets/nomyx_logo_black.svg";
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
              <img src={NomyxLogo} alt="Nomyx Logo" className="h-8 w-auto" />
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
                Compliance Rules
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
