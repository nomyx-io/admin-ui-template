import { WebAuthnSigner } from "@dfns/sdk-browser";

class DFNSService {
  private static _instance: DFNSService;

  public static get instance(): DFNSService {
    if (!DFNSService._instance) {
      DFNSService._instance = new DFNSService();
    }
    return DFNSService._instance;
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

      console.log("AddTrustedIssuer completed:", completeResponse);

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing AddTrustedIssuer:", error);
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

      console.log("CreateIdentity completed:", completeResponse);

      return { completeResponse, error: null };
    } catch (error: any) {
      console.error("Error completing CreateIdentity:", error);
      return { completeResponse: null, error: error.message };
    }
  }
}

export default DFNSService.instance;
