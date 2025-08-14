import React, { useEffect } from "react";
import { useRouter } from "next/router";
import SimpleAdminLoginForm from "./SimpleAdminLoginForm";
import logoDark from "../assets/nomyx_logo_dark.png";
import logoLight from "../assets/nomyx_logo_light.png";

interface LoginPageWrapperProps {
  forceLogout: boolean;
  onConnect: (address: string, provider: any) => Promise<void>;
  onDisconnect: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  service: any;
  selectedChainId: string;
  onChainChange: (chainId: string) => void;
  role: string[];
}

export const LoginPageWrapper: React.FC<LoginPageWrapperProps> = (props) => {
  const router = useRouter();

  // Redirect to home page if user is already logged in
  useEffect(() => {
    if (props.role && props.role.length > 0) {
      router.replace("/");
    }
  }, [props.role, router]);

  const handleLogin = async (email: string, password: string) => {
    await props.onLogin(email, password);
    // Navigation will happen via the useEffect when role is updated
  };

  return (
    <SimpleAdminLoginForm
      onLogin={handleLogin}
      onWalletConnect={async () => {
        // Wallet connect implementation will be handled by the parent component
        console.log("Wallet connect clicked in admin portal");
      }}
    />
  );
};

export default LoginPageWrapper;