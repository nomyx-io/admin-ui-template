// Basic type definitions for the admin portal
export type ReactLike = any;

export interface ComponentFactory<P = any> {
  (React: ReactLike): React.FC<P>;
}

export enum WalletPreference {
  MANAGED = 'managed',
  PRIVATE = 'private',
  DEV = 'dev',
  BACKEND = 'backend',
  WEB3 = 'web3'
}