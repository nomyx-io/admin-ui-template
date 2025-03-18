import { WebAuthnSigner } from "@dfns/sdk-browser";
import Parse from "parse";

class DfnsService {
  private static _instance: DfnsService;

  public static get instance(): DfnsService {
    if (!DfnsService._instance) {
      DfnsService._instance = new DfnsService();
    }
    return DfnsService._instance;
  }

  public async getInitialState() {}

  public async initiateAddClaimTopic(claimTopic: number, walletId: string, dfnsToken: string) {
    if (!walletId || !claimTopic || !dfnsToken) {
      throw new Error("Missing required parameters for AddClaimTopic.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsAddClaimTopicInit", {
        claimTopic,
        walletId,
        dfns_token: dfnsToken,
      });

      //AddClaimTopic initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating AddClaimTopic:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeAddClaimTopic(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing AddClaimTopic.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsAddClaimTopicComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // AddClaimTopic completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing AddClaimTopic:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateAddTrustedIssuer(trustedIssuer: string, claimTopics: number[], walletId: string, dfnsToken: string) {
    if (!trustedIssuer || !walletId || !claimTopics || !dfnsToken) {
      throw new Error("Missing required parameters for AddTrustedIssuer.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsAddTrustedIssuerInit", {
        trustedIssuer,
        claimTopics,
        walletId,
        dfns_token: dfnsToken,
      });

      // AddTrustedIssuer initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating AddTrustedIssuer:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeAddTrustedIssuer(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing AddTrustedIssuer.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsAddTrustedIssuerComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // AddTrustedIssuer completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing AddTrustedIssuer:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateRemoveTrustedIssuer(trustedIssuer: string, walletId: string, dfnsToken: string) {
    if (!trustedIssuer || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for RemoveTrustedIssuer.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsRemoveTrustedIssuerInit", {
        trustedIssuer,
        walletId,
        dfns_token: dfnsToken,
      });

      // RemoveTrustedIssuer initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating RemoveTrustedIssuer:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeRemoveTrustedIssuer(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing RemoveTrustedIssuer.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsRemoveTrustedIssuerComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // RemoveTrustedIssuer completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing RemoveTrustedIssuer:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateUpdateTrustedIssuer(trustedIssuer: string, claimTopics: number[], walletId: string, dfnsToken: string) {
    if (!trustedIssuer || !claimTopics || !walletId || !dfnsToken || !Array.isArray(claimTopics)) {
      throw new Error("Missing required parameters for UpdateIssuerClaimTopics.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsUpdateIssuerClaimTopicsInit", {
        trustedIssuer,
        claimTopics,
        walletId,
        dfns_token: dfnsToken,
      });

      // UpdateIssuerClaimTopics initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating UpdateIssuerClaimTopics:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeUpdateTrustedIssuer(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing UpdateIssuerClaimTopics.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsUpdateIssuerClaimTopicsComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // UpdateIssuerClaimTopics completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing UpdateIssuerClaimTopics:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateCreateIdentity(ownerAddress: string, walletId: string, dfnsToken: string) {
    if (!ownerAddress || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for CreateIdentity.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsCreateIdentityInit", {
        ownerAddress,
        walletId,
        dfns_token: dfnsToken,
      });

      // CreateIdentity initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating CreateIdentity:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeCreateIdentity(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing CreateIdentity.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsCreateIdentityComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // CreateIdentity completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing CreateIdentity:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async getIdentity(walletAddress: string) {
    const maxRetries = 3,
      delay = 1000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await Parse.Cloud.run("dfnsGetIdentity", {
          identityOwner: walletAddress,
        });
        if (response?.identity) {
          return response.identity; // Return identity if found
        }
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed: ${error.message}`);
      }
      // Wait for 1 second before retrying (if not the last attempt)
      if (attempt < maxRetries) await new Promise((res) => setTimeout(res, delay));
    }
    console.error("Max retry attempts reached. Failed to fetch identity.");
    return null; // Return null if all retries fail
  }

  public async initiateAddIdentity(ownerAddress: string, identity: any, walletId: string, dfnsToken: string) {
    if (!ownerAddress || !identity || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for AddIdentity.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsAddIdentityInit", {
        ownerAddress,
        identityData: identity,
        walletId,
        dfns_token: dfnsToken,
      });

      // AddIdentity initiation response:", initiateResponse;

      return { addIdentityInitResponse: initiateResponse, addIdentityInitError: null };
    } catch (error: any) {
      console.error("Error initiating AddIdentity:", error);
      return { addIdentityInitResponse: null, addIdentityInitError: error.message };
    }
  }

  public async completeAddIdentity(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing AddIdentity.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsAddIdentityComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // AddIdentity completed:", completeResponse;

      return { addIdentityCompleteResponse: completeResponse, addIdentityCompleteError: null };
    } catch (error: any) {
      console.error("Error completing AddIdentity:", error);
      return { addIdentityCompleteResponse: null, addIdentityCompleteError: error.message };
    }
  }

  public async initiateSetClaims(address: string, claims: number[], walletId: string, dfnsToken: string) {
    if (!address || !claims || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for SetClaims.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsSetClaimsInit", {
        address,
        claims,
        walletId,
        dfns_token: dfnsToken,
      });

      // SetClaims initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating SetClaims:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeSetClaims(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing SetClaims.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsSetClaimsComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // SetClaims completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing SetClaims:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateAddClaim(address: string, claimTopic: number, claim: any, walletId: string, dfnsToken: string) {
    if (!address || !claimTopic || !claim || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for AddClaim.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsAddClaimInit", {
        address,
        claimTopic,
        claim,
        walletId,
        dfns_token: dfnsToken,
      });

      // AddClaim initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating AddClaim:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeAddClaim(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing AddClaim.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsAddClaimComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // AddClaim completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing AddClaim:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateRemoveClaim(address: string, claimTopic: number, walletId: string, dfnsToken: string) {
    if (!address || !claimTopic || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for RemoveClaim.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsRemoveClaimInit", {
        address,
        claimTopic,
        walletId,
        dfns_token: dfnsToken,
      });

      // RemoveClaim initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating RemoveClaim:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeRemoveClaim(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing RemoveClaim.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsRemoveClaimComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // RemoveClaim completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing RemoveClaim:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateGemforceMint(metadata: any, walletId: string, dfnsToken: string) {
    if (!metadata || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for GemforceMint.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsGemforceMintInit", {
        metadata,
        walletId,
        dfns_token: dfnsToken,
      });

      // GemforceMint initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating GemforceMint:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeGemforceMint(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing GemforceMint.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsGemforceMintComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // GemforceMint completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing GemforceMint:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateRemoveIdentity(ownerAddress: string, walletId: string, dfnsToken: string) {
    if (!ownerAddress || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for RemoveIdentity.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsRemoveIdentityInit", {
        ownerAddress,
        walletId,
        dfns_token: dfnsToken,
      });

      // RemoveIdentity initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating RemoveClaim:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeRemoveIdentity(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing RemoveIdentity.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsRemoveIdentityComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      //RemoveIdentity completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing RemoveIdentity:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateUnregisterIdentity(identityAddress: string, walletId: string, dfnsToken: string) {
    if (!identityAddress || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for UnregisterIdentity.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsUnregisterIdentityInit", {
        identityAddress,
        walletId,
        dfns_token: dfnsToken,
      });

      // UnregisterIdentity initiation response:", initiateResponse;

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating RemoveClaim:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeUnregisterIdentity(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing UnregisterIdentity.");
    }

    try {
      const webauthn = new WebAuthnSigner();
      const assertion = await webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsUnregisterIdentityComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      // UnregisterIdentity completed:", completeResponse;

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing UnregisterIdentity:", error);
      return { completeResponse: null, error: error.message };
    }
  }
}

export default DfnsService.instance;
