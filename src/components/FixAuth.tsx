import React, { useState } from "react";

import { WebAuthnSigner } from "@dfns/sdk-browser";
import Parse from "parse";
import { toast } from "react-toastify";

export const FixAuth = ({ dfnsToken }: { dfnsToken: string | null }) => {
  const [loading, setLoading] = useState(false);
  const [walletId, setWalletId] = useState("wa-01jmk-79dd5-e5mad9le01ffdqiu");
  const [owner] = useState("0x084E947E6a456B16eD78c749f3DAF14C58661711");

  const handleFixAuth = async () => {
    if (!dfnsToken) {
      toast.error("DFNS Token is missing. Please log in.");
      return;
    }

    setLoading(true);
    try {
      const webauthn = new WebAuthnSigner({
        relyingParty: {
          id: process.env.REACT_APP_DFNS_RELYING_PARTY || "localhost",
          name: "Nomyx Admin Portal",
        },
      });

      toast.info("Initiating Fee Controller Update...");
      const feeInit = await Parse.Cloud.run("dfnsSetFeeControllerInit", {
        walletId,
        controller: owner,
        dfns_token: dfnsToken,
      });

      toast.info("Please sign the WebAuthn challenge for Fee Controller...");
      const feeAssertion = await webauthn.sign(feeInit.challenge);

      await Parse.Cloud.run("dfnsSetFeeControllerComplete", {
        walletId,
        requestBody: feeInit.requestBody,
        signedChallenge: {
          challengeIdentifier: feeInit.challenge.challengeIdentifier,
          firstFactor: feeAssertion,
        },
        dfns_token: dfnsToken,
      });
      toast.success("Fee Controller Updated successfully!");

      toast.info("Initiating Trusted Issuer Addition...");
      const issuerInit = await Parse.Cloud.run("dfnsAddTrustedIssuerInit", {
        walletId,
        trustedIssuer: owner,
        claimTopics: [1],
        dfns_token: dfnsToken,
      });

      toast.info("Please sign the WebAuthn challenge for Trusted Issuer...");
      const issuerAssertion = await webauthn.sign(issuerInit.challenge);

      await Parse.Cloud.run("dfnsAddTrustedIssuerComplete", {
        walletId,
        requestBody: issuerInit.requestBody,
        signedChallenge: {
          challengeIdentifier: issuerInit.challenge.challengeIdentifier,
          firstFactor: issuerAssertion,
        },
        dfns_token: dfnsToken,
      });
      toast.success("Trusted Issuer Added successfully!");
    } catch (error: any) {
      console.error("Error fixing auth:", error);
      toast.error(`Fix failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Fix Diamond Authorization</h2>
      <p className="mb-4 text-gray-600">
        This will update the Fee Controller and add the owner as a Trusted Issuer. You will be prompted to sign two WebAuthn challenges.
      </p>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Wallet ID</label>
        <input
          type="text"
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Owner Address</label>
        <input
          type="text"
          value={owner}
          disabled
          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm p-2 border"
        />
      </div>
      <button
        onClick={handleFixAuth}
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
      >
        {loading ? "Processing..." : "Fix Authorization"}
      </button>
    </div>
  );
};
