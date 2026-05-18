import { createContext, useContext } from "react";

export interface TenantAssets {
  logoUrl?: string;
  logoDarkUrl?: string;
  authBackgroundUrl?: string;
  faviconUrl?: string;
}

export interface Tenant {
  id?: string;
  brand?: { name?: string; productSuffix?: string };
  assets?: TenantAssets;
  // Other manifest sections (theme, nav, wordMappings, legal) are not consumed yet.
  [key: string]: unknown;
}

export const TenantContext = createContext<Tenant | null>(null);

export const useTenant = (): Tenant => {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used inside <TenantProvider>");
  }
  return ctx;
};
