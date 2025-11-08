import type { NextApiRequest } from "next";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * Unified blockchain-agnostic credentials provider
 * Handles authentication for any blockchain supported by nomyx-ts
 */
const BlockchainCredentials = CredentialsProvider({
  id: "blockchain",
  name: "Blockchain Wallet",
  credentials: {
    message: { label: "Message", type: "password" },
    signature: { label: "Signature", type: "password" },
    account: { label: "Account", type: "text" },
    walletProvider: { label: "Wallet Provider", type: "text" },
    chainId: { label: "Chain ID", type: "text" },
  },
  async authorize(credentials: Record<string, any> | undefined, req: NextApiRequest | any) {
    if (!credentials) {
      console.error("[BlockchainCredentials] Missing credentials");
      return null;
    }

    const { message, signature, account, walletProvider, chainId } = credentials;

    // Basic validation
    if (!account || !walletProvider || !chainId) {
      console.error("[BlockchainCredentials] Missing required fields: account, walletProvider, or chainId");
      return null;
    }

    try {
      // Basic address validation - check if it looks like a valid blockchain address
      // Ethereum: 0x followed by 40 hex chars
      // Stellar: G followed by 55 chars
      const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(account);
      const isStellarAddress = /^G[A-Z2-7]{55}$/.test(account);

      if (!isEthAddress && !isStellarAddress) {
        console.error("[BlockchainCredentials] Invalid address format for chain:", chainId);
        return null;
      }

      // Determine chain type from address format or chainId
      const chainType = chainId.includes('stellar') ? 'stellar' : 'ethereum';

      // For Ethereum chains, use Parse backend authentication
      if (chainType === 'ethereum') {
        const parseAppId = process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID;
        const parseJsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY;
        const parseServerUrl = process.env.INTERNAL_PARSE_SERVER_URL;

        if (!parseAppId || !parseJsKey || !parseServerUrl) {
          console.error("[BlockchainCredentials] Missing Parse configuration");
          return null;
        }

        const res = await fetch(`${parseServerUrl}/functions/authLogin`, {
          method: "POST",
          body: JSON.stringify({
            walletAddress: account,
            message,
            signature,
            chainCode: chainId
          }),
          headers: {
            "Content-Type": "application/json",
            "X-Parse-Application-Id": parseAppId,
            "X-Parse-Javascript-Key": parseJsKey,
          },
        });

        const data = await res.json();
        const result = data.result || {};
        const userFromResponse = result.user && typeof result.user === "object" ? result.user : {};
        const { personaVerificationData, ...userWithoutPersonaData } = userFromResponse;

        if (res.ok && Object.keys(userWithoutPersonaData).length > 0) {
          return {
            ...userWithoutPersonaData,
            accessToken: result.sessionToken || result.access_token,
            chain: chainType,
            chainId: chainId,
            walletProvider: walletProvider
          };
        }
        console.error("[BlockchainCredentials] Ethereum auth failed:", data);
        return null;
      }

      // For non-Ethereum chains (e.g., Stellar), use Parse backend authentication
      // This ensures consistent auth flow with proper Parse session tokens
      console.log(`[BlockchainCredentials] Authorizing ${chainType} wallet via Parse backend:`, account);

      const parseAppId = process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID;
      const parseJsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY;
      const parseServerUrl = process.env.INTERNAL_PARSE_SERVER_URL;

      if (!parseAppId || !parseJsKey || !parseServerUrl) {
        console.error("[BlockchainCredentials] Missing Parse configuration");
        return null;
      }

      const res = await fetch(`${parseServerUrl}/functions/authLogin`, {
        method: "POST",
        body: JSON.stringify({
          walletAddress: account,
          message,
          signature,
          chainCode: chainId
        }),
        headers: {
          "Content-Type": "application/json",
          "X-Parse-Application-Id": parseAppId,
          "X-Parse-Javascript-Key": parseJsKey,
        },
      });

      const data = await res.json();
      const result = data.result || {};
      const userFromResponse = result.user && typeof result.user === "object" ? result.user : {};

      if (res.ok && Object.keys(userFromResponse).length > 0) {
        console.log(`[BlockchainCredentials] Successfully authorized ${chainType} user via Parse:`, userFromResponse.id);
        return {
          ...userFromResponse,
          accessToken: result.sessionToken,
          chain: chainType,
          chainId: chainId,
          walletProvider: walletProvider
        };
      }

      console.error("[BlockchainCredentials] Parse authentication failed for Stellar:", data);
      return null;

    } catch (error) {
      console.error("[BlockchainCredentials] Error during authentication:", error);
      return null;
    }
  },
});

export default BlockchainCredentials;
