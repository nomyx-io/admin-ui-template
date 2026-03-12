import { WebAuthnSigner } from "@dfns/sdk-browser";
import Parse from "parse";

class DfnsService {
  private static _instance: DfnsService;
  private webauthn: WebAuthnSigner;

  constructor() {
    this.webauthn = new WebAuthnSigner({
      relyingParty: {
        id: process.env.REACT_APP_DFNS_RELYING_PARTY || "localhost",
        name: "Nomyx Admin Portal",
      },
    });
  }
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

      console.log("AddClaimTopic initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsAddClaimTopicComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("AddClaimTopic completed:", completeResponse);

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

      console.log("AddTrustedIssuer initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsAddTrustedIssuerComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("AddTrustedIssuer completed:", completeResponse);

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

      console.log("RemoveTrustedIssuer initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsRemoveTrustedIssuerComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("RemoveTrustedIssuer completed:", completeResponse);

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

      console.log("UpdateIssuerClaimTopics initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsUpdateIssuerClaimTopicsComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("UpdateIssuerClaimTopics completed:", completeResponse);

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing UpdateIssuerClaimTopics:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateCreateIdentity(ownerAddress: string, walletId: string, dfnsToken: string, secondaryWallets: string[] = []) {
    if (!ownerAddress || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for CreateIdentity.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsCreateIdentityInit", {
        ownerAddress,
        walletId,
        dfns_token: dfnsToken,
        additionalWallets: secondaryWallets,
      });

      console.log("CreateIdentity initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsCreateIdentityComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("CreateIdentity completed:", completeResponse);

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing CreateIdentity:", error);
      return { completeResponse: null, error: error.message };
    }
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

      console.log("AddIdentity initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsAddIdentityComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("AddIdentity completed:", completeResponse);

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

      console.log("SetClaims initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsSetClaimsComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("SetClaims completed:", completeResponse);

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

      console.log("AddClaim initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsAddClaimComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("AddClaim completed:", completeResponse);

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

      console.log("RemoveClaim initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsRemoveClaimComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("RemoveClaim completed:", completeResponse);

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

      console.log("GemforceMint initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsGemforceMintComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("GemforceMint completed:", completeResponse);

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

      console.log("RemoveIdentity initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsRemoveIdentityComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("RemoveIdentity completed:", completeResponse);

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

      console.log("UnregisterIdentity initiation response:", initiateResponse);

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
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsUnregisterIdentityComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("UnregisterIdentity completed:", completeResponse);

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing UnregisterIdentity:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateTransferOwnership(newOwnerAddress: string, walletId: string, dfnsToken: string) {
    if (!newOwnerAddress || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for TransferOwnership.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsInitTransferOwnership", {
        newOwnerAddress,
        walletId,
        dfns_token: dfnsToken,
      });

      console.log("TransferOwnership initiation response:", initiateResponse);

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating TransferOwnership:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeTransferOwnership(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing TransferOwnership.");
    }

    try {
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsCompleteTransferOwnership", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("TransferOwnership completed:", completeResponse);

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing TransferOwnership:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateLinkWallet(identityAddress: string, walletAddress: string, walletId: string, dfnsToken: string) {
    if (!identityAddress || !walletAddress || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for LinkWallet.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsLinkUserWalletInit", {
        identityAddress,
        walletAddress,
        walletId,
        dfns_token: dfnsToken,
      });

      console.log("LinkWallet initiation response:", initiateResponse);

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating LinkWallet:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeLinkWallet(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing LinkWallet.");
    }

    try {
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsLinkUserWalletComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("LinkWallet completed:", completeResponse);

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing LinkWallet:", error);
      return { completeResponse: null, error: error.message };
    }
  }

  public async initiateUnlinkWallet(identityAddress: string, walletAddress: string, walletId: string, dfnsToken: string) {
    if (!identityAddress || !walletAddress || !walletId || !dfnsToken) {
      throw new Error("Missing required parameters for UnlinkWallet.");
    }

    try {
      const initiateResponse = await Parse.Cloud.run("dfnsUnlinkUserWalletInit", {
        identityAddress,
        walletAddress,
        walletId,
        dfns_token: dfnsToken,
      });

      console.log("UnlinkWallet initiation response:", initiateResponse);

      return { initiateResponse, error: null };
    } catch (error: any) {
      console.error("Error initiating UnlinkWallet:", error);
      return { initiateResponse: null, error: error.message };
    }
  }

  public async completeUnlinkWallet(walletId: string, dfnsToken: string, challenge: any, requestBody: any) {
    if (!walletId || !dfnsToken || !challenge || !requestBody) {
      throw new Error("Missing required parameters for completing UnlinkWallet.");
    }

    try {
      const assertion = await this.webauthn.sign(challenge);

      const completeResponse = await Parse.Cloud.run("dfnsUnlinkUserWalletComplete", {
        walletId,
        dfns_token: dfnsToken,
        signedChallenge: {
          challengeIdentifier: challenge.challengeIdentifier,
          firstFactor: assertion,
        },
        requestBody,
      });

      console.log("UnlinkWallet completed:", completeResponse);

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing UnlinkWallet:", error);
      return { completeResponse: null, error: error.message };
    }
  }
}

export default DfnsService.instance;
