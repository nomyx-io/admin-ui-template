import { createContext, useContext, Dispatch, SetStateAction } from "react";

import { WalletPreference } from "../utils/Constants";

// Define the shape of the context
interface RoleContextType {
  role: string[];
  setRole: Dispatch<SetStateAction<string[]>>;
  walletPreference: WalletPreference | null;
  setWalletPreference: Dispatch<SetStateAction<WalletPreference | null>>;
  dfnsToken: string | null;
  setDfnsToken: Dispatch<SetStateAction<string | null>>;
  user: any;
  setUser: Dispatch<SetStateAction<any>>;
}

// Provide default values that align with the interface
const defaultContext: RoleContextType = {
  role: [],
  setRole: () => {},
  walletPreference: null,
  setWalletPreference: () => {},
  dfnsToken: null,
  setDfnsToken: () => {},
  user: null,
  setUser: () => {},
};

// Create and export the RoleContext with the defined type
export const RoleContext = createContext<RoleContextType>(defaultContext);

// Optional: Create a custom hook for easier consumption
export const useRoleContext = () => useContext(RoleContext);
