// ./context/RoleContext.tsx

import React, { createContext, useContext, Dispatch, SetStateAction } from "react";

import { WalletPreference } from "../utils/Constants";

// Define the shape of the context
interface RoleContextType {
  role: string[];
  setRole: Dispatch<SetStateAction<string[]>>;
  walletPreference: WalletPreference | null;
  setWalletPreference: Dispatch<SetStateAction<WalletPreference | null>>;
}

// Provide default values that align with the interface
const defaultContext: RoleContextType = {
  role: [],
  setRole: () => {},
  walletPreference: null,
  setWalletPreference: () => {},
};

// Create and export the RoleContext with the defined type
export const RoleContext = createContext<RoleContextType>(defaultContext);

// Optional: Create a custom hook for easier consumption
export const useRoleContext = () => useContext(RoleContext);
