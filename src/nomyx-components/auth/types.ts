export enum LoginPreference {
  USERNAME_PASSWORD = "USERNAME_PASSWORD",
  WALLET = "WALLET",
}

export enum WalletPreference {
  BACKEND = "BACKEND",
  WEB3 = "WEB3",
}

export interface AuthUser {
  id: string;
  email?: string;
  roles?: string[];
  walletPreference?: WalletPreference;
  walletAddress?: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
  roles: string[];
  walletPreference?: WalletPreference;
  dfnsToken?: string;
}

export interface ProtectedRouteProps {
  role?: string | string[];
  roles: string[];
  children: any; // Generic children type
  redirectTo?: string;
  onNavigate?: (path: string, state?: any) => void;
}