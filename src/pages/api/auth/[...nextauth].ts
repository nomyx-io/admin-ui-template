import NextAuth, { AuthOptions } from "next-auth";

import BlockchainCredentials from "@/auth/BlockchainCredentials";
import { StandardCredentials } from "@/auth/Credentials";

// Use unified blockchain credentials provider instead of chain-specific ones
const providers = [StandardCredentials, BlockchainCredentials];

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 60,
  },
  jwt: {
    maxAge: 30 * 60,
  },
  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      console.log("[NextAuth Redirect] URL:", url, "BaseURL:", baseUrl);

      // Simplified redirect logic - NEXTAUTH_URL is correctly set in .env
      // Relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Absolute URLs on same origin
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        if (urlObj.origin === baseUrlObj.origin) {
          return url;
        }
      } catch {
        // If URL parsing fails, fall back to baseUrl
      }

      // Default fallback
      return baseUrl;
    },
    async signIn({ user, account, profile, email, credentials }: any) {
      console.log("next-auth signIn! Provider:", account?.provider, "Chain:", user?.chain);
      return true;
    },
    async jwt({ token, user, account, profile }: any) {
      console.log("[NextAuth JWT] Called with:", {
        hasToken: !!token,
        hasUser: !!user,
        hasAccount: !!account,
        userId: user?.id,
        userAccessToken: user?.accessToken,
        tokenId: token?.id,
        tokenAccessToken: token?.accessToken,
      });

      if (user) {
        // User exists → First login or sign-in → Set fresh expiration & return user details
        console.log("[NextAuth JWT] Creating new token for user:", user.id);
        console.log("[NextAuth JWT] User object:", JSON.stringify(user, null, 2));

        // Store Parse sessionToken in localStorage for PermissionsService and Parse SDK
        // This is done server-side but will be available to client via session
        if (user.accessToken) {
          console.log("[NextAuth JWT] Parse sessionToken available, will be stored in session");
        }

        // Create a clean token with only serializable data
        // Fix: Create a clean object without spreading to avoid non-serializable data
        const newToken: any = {};

        // Only include primitive, serializable values
        if (user.id !== undefined) newToken.id = String(user.id);
        if (user.objectId !== undefined && !newToken.id) newToken.id = String(user.objectId);
        if (user.email !== undefined) newToken.email = String(user.email);
        if (user.username !== undefined) newToken.username = String(user.username);
        if (user.role !== undefined) newToken.role = String(user.role);
        if (user.walletAddress !== undefined) newToken.walletAddress = String(user.walletAddress);
        if (user.walletPreference !== undefined) newToken.walletPreference = String(user.walletPreference);
        if (user.chain !== undefined) newToken.chain = String(user.chain);
        if (user.walletProvider !== undefined) newToken.walletProvider = String(user.walletProvider);
        if (user.chainId !== undefined) newToken.chainId = String(user.chainId);
        if (user.accessToken !== undefined) newToken.accessToken = String(user.accessToken);
        if (user.dfns_token !== undefined) newToken.dfns_token = String(user.dfns_token);

        // Always set expiration
        newToken.exp = Math.floor(Date.now() / 1000) + 30 * 60;

        console.log("[NextAuth JWT] New token created:", {
          id: newToken.id,
          hasAccessToken: !!newToken.accessToken,
          chain: newToken.chain,
          walletAddress: newToken.walletAddress,
          walletPreference: newToken.walletPreference,
        });

        // Handle multi-chain wallet connections dynamically
        if (token && token.walletAddress && token.chain && user.chain !== token.chain) {
          console.log(`[NextAuth] Multi-chain session: Adding ${user.chain} wallet to existing ${token.chain} session`);
          // Store additional chain wallet info with chain-specific key
          newToken[`${user.chain}WalletAddress`] = String(user.walletAddress);
          newToken[`${user.chain}WalletProvider`] = String(user.walletProvider);
          newToken[`${user.chain}ChainId`] = String(user.chainId);
          // Preserve original chain info
          if (token.walletAddress !== undefined) newToken.walletAddress = String(token.walletAddress);
          if (token.chain !== undefined) newToken.chain = String(token.chain);
          if (token.walletProvider !== undefined) newToken.walletProvider = String(token.walletProvider);
          if (token.chainId !== undefined) newToken.chainId = String(token.chainId);
        }

        return newToken;
      }

      // If no user provided, return existing token if it has required fields
      if (token && typeof token === 'object' && token.id && token.accessToken) {
        console.log("[NextAuth JWT] Preserving existing token for user:", token.id);

        // Create a clean copy of the token
        const cleanToken: any = {};

        // Only copy serializable fields
        if (token.id !== undefined) cleanToken.id = String(token.id);
        if (token.email !== undefined) cleanToken.email = String(token.email);
        if (token.username !== undefined) cleanToken.username = String(token.username);
        if (token.role !== undefined) cleanToken.role = String(token.role);
        if (token.walletAddress !== undefined) cleanToken.walletAddress = String(token.walletAddress);
        if (token.walletPreference !== undefined) cleanToken.walletPreference = String(token.walletPreference);
        if (token.chain !== undefined) cleanToken.chain = String(token.chain);
        if (token.walletProvider !== undefined) cleanToken.walletProvider = String(token.walletProvider);
        if (token.chainId !== undefined) cleanToken.chainId = String(token.chainId);
        if (token.accessToken !== undefined) cleanToken.accessToken = String(token.accessToken);
        if (token.dfns_token !== undefined) cleanToken.dfns_token = String(token.dfns_token);

        // Copy any multi-chain wallet info
        Object.keys(token).forEach((key) => {
          if (key.endsWith("WalletAddress") || key.endsWith("WalletProvider") || key.endsWith("ChainId")) {
            cleanToken[key] = String(token[key]);
          }
        });

        // Refresh expiration if token is still valid
        if (!token.exp || token.exp < Math.floor(Date.now() / 1000) + 5 * 60) {
          cleanToken.exp = Math.floor(Date.now() / 1000) + 30 * 60;
        } else {
          cleanToken.exp = token.exp;
        }

        return cleanToken;
      }

      // If token is invalid or missing required fields, return empty object instead of null
      console.warn("[NextAuth JWT] Token missing required fields, returning empty token. Token:", JSON.stringify(token, null, 2));
      return {};
    },
    async session({ session, token }: { session: any; token: any }): Promise<any> {
      console.log("[NextAuth Session] Processing session for token:", token?.id);
      console.log("[NextAuth Session] Token contains:", {
        id: token?.id,
        walletAddress: token?.walletAddress,
        walletPreference: token?.walletPreference,
        hasAllFields: Object.keys(token || {}).join(", "),
      });

      if (!token || typeof token !== 'object') {
        console.warn("[NextAuth Session] No token found, returning empty session");
        return { expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
      }

      if (!token?.exp) {
        console.warn("⚠️ Warning: No expiration found. Assuming session is still valid.");
        // Don't return raw session - need to populate it first
      }

      if (token.exp && Date.now() >= token.exp * 1000) {
        console.log("[NextAuth Session] Token expired, returning empty session");
        return { expires: new Date().toISOString() }; // Return expired session
      }

      // Only proceed if token has required fields
      if (!token.id || !token.accessToken) {
        console.warn("[NextAuth Session] Token missing required fields, returning empty session");
        return { expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
      }

      // Create a clean session object with only serializable data
      const cleanSession = {
        user: {
          id: String(token.id),
          email: token.email ? String(token.email) : undefined,
          username: token.username ? String(token.username) : undefined,
          role: token.role ? String(token.role) : undefined,
          walletAddress: token.walletAddress ? String(token.walletAddress) : undefined,
          walletPreference: token.walletPreference ? String(token.walletPreference) : undefined,
          chain: token.chain ? String(token.chain) : undefined,
          walletProvider: token.walletProvider ? String(token.walletProvider) : undefined,
          chainId: token.chainId ? String(token.chainId) : undefined,
          accessToken: String(token.accessToken),
          dfns_token: token.dfns_token ? String(token.dfns_token) : undefined,
        },
        expires: new Date(token.exp * 1000).toISOString(),
      };

      // Add multi-chain wallet information to session dynamically
      // Look for any chain-specific wallet addresses in token
      Object.keys(token).forEach((key) => {
        if (key.endsWith("WalletAddress") || key.endsWith("WalletProvider") || key.endsWith("ChainId")) {
          (cleanSession.user as any)[key] = String(token[key]);
        }
      });

      // Remove undefined values from the user object
      Object.keys(cleanSession.user).forEach(key => {
        if ((cleanSession.user as any)[key] === undefined) {
          delete (cleanSession.user as any)[key];
        }
      });

      return cleanSession;
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
} satisfies AuthOptions;

export default async function auth(req: any, res: any) {
  // Log the configured NEXTAUTH_URL for debugging
  console.log("[NextAuth Init] NEXTAUTH_URL:", process.env.NEXTAUTH_URL);

  return await NextAuth(req, res, authOptions);
}
