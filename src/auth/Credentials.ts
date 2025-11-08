import type { NextApiRequest } from "next"; // Using NextApiRequest as a general type for req
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * @deprecated Use BlockchainCredentials instead for blockchain-agnostic authentication
 */
const EthereumCredentials = CredentialsProvider({
  id: "ethereum",
  name: "Ethereum",
  credentials: {
    message: { label: "Message", type: "password" },
    signature: { label: "Signature", type: "password" },
  },
  async authorize(credentials: Record<string, any> | undefined, req: any): Promise<any> {
    const parseAppId = process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID;
    const parseJsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY;
    const parseServerUrl = process.env.INTERNAL_PARSE_SERVER_URL; // Use internal URL for server-side fetch

    if (!credentials || !parseAppId || !parseJsKey || !parseServerUrl) {
      console.error("Missing credentials or Parse configuration for NextAuth EthereumCredentials");
      return null;
    }

    try {
      const res = await fetch(`${parseServerUrl}/functions/authLogin`, {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: {
          "Content-Type": "application/json",
          "X-Parse-Application-Id": parseAppId,
          "X-Parse-Javascript-Key": parseJsKey,
        },
      });

      const data = await res.json();
      const result = data.result || {}; // The actual response is nested in the 'result' object
      const userFromResponse = result.user && typeof result.user === "object" ? result.user : {};
      // Exclude personaVerificationData from user object if it exists
      const { personaVerificationData, ...userWithoutPersonaData } = userFromResponse;

      if (res.ok && Object.keys(userWithoutPersonaData).length > 0) {
        return { ...userWithoutPersonaData, accessToken: result.access_token }; // No dfns_token for Ethereum
      }
      console.error("EthereumCredentials authorize failed:", data);
      return null;
    } catch (error) {
      console.error("Error during Ethereum login:", error);
      return null;
    }
  },
});

/**
 * @deprecated Use BlockchainCredentials instead for blockchain-agnostic authentication
 */
const StellarCredentials = CredentialsProvider({
  id: "stellar",
  name: "Stellar",
  credentials: {
    message: { label: "Message", type: "password" },
    signature: { label: "Signature", type: "password" },
    account: { label: "Account", type: "text" },
    walletProvider: { label: "Wallet Provider", type: "text" },
  },
  async authorize(credentials: Record<string, any> | undefined, req: any): Promise<any> {
    if (!credentials) {
      console.error("Missing credentials for NextAuth StellarCredentials");
      return null;
    }

    console.log("[StellarCredentials] Authorizing Stellar wallet:", credentials.account);
    console.log("[StellarCredentials] Received credentials:", JSON.stringify(credentials, null, 2));

    try {
      // For Stellar wallets, we use a simplified authentication approach
      // The successful wallet connection itself is proof of ownership
      // We'll validate the credentials format and create a user session

      const { signature, message, account, walletProvider } = credentials;

      // Basic validation
      if (!account || !walletProvider) {
        console.error("[StellarCredentials] Missing required credentials: account or walletProvider");
        return null;
      }

      // Validate that this looks like a Stellar public key
      if (!account.match(/^G[A-Z2-7]{55}$/)) {
        console.error("[StellarCredentials] Invalid Stellar public key format:", account);
        return null;
      }

      // For now, we'll accept any signature/message since wallet connection is proof enough
      // In production, you might want to validate against a stored nonce or similar

      // Add a small delay to prevent rapid authentication attempts
      await new Promise((resolve) => setTimeout(resolve, 100));

      // For now, we'll create a simplified user object for Stellar authentication
      // In a production environment, you might want to:
      // 1. Store/retrieve user profiles from a database
      // 2. Validate the account against a whitelist
      // 3. Check for existing accounts and link them

      const stellarUser = {
        id: `stellar_${account}`,
        walletAddress: account,
        chain: "stellar",
        walletProvider: walletProvider,
        // Create a simple access token for API calls
        accessToken: `stellar_session_${Date.now()}_${account.substring(0, 8)}`,
        // Add basic user info
        username: `stellar_user_${account.substring(0, 8)}`,
        email: null, // Stellar wallets don't have email by default
        // Add expiration to match JWT settings
        exp: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
        iat: Math.floor(Date.now() / 1000),
      };

      console.log("[StellarCredentials] Successfully authorized Stellar user:", stellarUser.id);
      return stellarUser;
    } catch (error) {
      console.error("Error during Stellar authorization:", error);
      return null;
    }
  },
});

const StandardCredentials = CredentialsProvider({
  id: "standard",
  name: "Standard",
  credentials: {
    email: { label: "Email", type: "email", placeholder: "Enter your email." },
    password: { label: "Password", type: "password", placeholder: "Enter your password." },
  },
  async authorize(credentials: Record<string, any> | undefined, req: any): Promise<any> {
    const parseAppId = process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID;
    const parseJsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY;
    const parseServerUrl = process.env.INTERNAL_PARSE_SERVER_URL; // Use internal URL for server-side fetch

    if (!credentials || !parseAppId || !parseJsKey || !parseServerUrl) {
      console.error("Missing credentials or Parse configuration for NextAuth StandardCredentials");
      return null;
    }

    try {
      const res = await fetch(`${parseServerUrl}/functions/authLogin`, {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: {
          "Content-Type": "application/json",
          "X-Parse-Application-Id": parseAppId,
          "X-Parse-Javascript-Key": parseJsKey,
        },
      });

      const data = await res.json();
      console.log("[StandardCredentials] Parse authLogin response:", JSON.stringify(data, null, 2));

      const result = data.result || {}; // The actual response is nested in the 'result' object
      const userFromResponse = result.user && typeof result.user === "object" ? result.user : {};
      // Exclude personaVerificationData from user object if it exists
      const { personaVerificationData, ...userWithoutPersonaData } = userFromResponse;

      console.log("[StandardCredentials] Access token:", result.access_token);
      console.log("[StandardCredentials] User data:", JSON.stringify(userWithoutPersonaData, null, 2));

      if (res.ok && Object.keys(userWithoutPersonaData).length > 0) {
        const authUser = {
          ...userWithoutPersonaData,
          id: userWithoutPersonaData.id || userWithoutPersonaData.objectId, // Map Parse id or objectId to NextAuth id
          accessToken: result.access_token,
          dfns_token: result.dfns_token, // dfns_token is specific to StandardCredentials
          // Ensure we have username/email for display
          email: userWithoutPersonaData.email || userWithoutPersonaData.username,
          username: userWithoutPersonaData.username,
          // Include wallet information
          walletAddress: userWithoutPersonaData.walletAddress,
          walletPreference: userWithoutPersonaData.walletPreference,
        };

        console.log("[StandardCredentials] Returning auth user:", JSON.stringify(authUser, null, 2));
        return authUser;
      }
      console.error("StandardCredentials authorize failed:", data);
      return null;
    } catch (error) {
      console.error("Error during Standard login:", error);
      return null;
    }
  },
});

// Export only StandardCredentials by default
// EthereumCredentials and StellarCredentials are deprecated - use BlockchainCredentials instead
export { StandardCredentials };
