import React, { useCallback, useEffect, useContext } from "react";

import { Breadcrumb, Button, Input } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isAlphanumericAndSpace } from "../utils";
import { WalletPreference } from "../utils/Constants";

function CreateClaimTopic({ service }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = React.useState("");
  const [hiddenName, setHiddenName] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  const getNextClaimTopicId = useCallback(async () => {
    try {
      const nextClaimTopicId = await service.getNextClaimTopicId();
      setHiddenName(nextClaimTopicId);
      setDisplayName("");
    } catch (e) {
      console.error("Failed get next compliance rule ID:", e);
      toast.error("Failed to load initial data");
    }
  }, [service]);

  function validateClaimTopic(displayName) {
    if (displayName.trim() === "") {
      toast.error("Display Name is required");
      return false;
    }

    if (!isAlphanumericAndSpace(displayName)) {
      toast.error("Display Name must contain only alphanumeric characters");
      return false;
    }

    return true;
  }

  const saveClaimTopic = async () => {
    const trimmedDisplayName = displayName.trim();

    if (!validateClaimTopic(trimmedDisplayName)) {
      return;
    }

    if (walletPreference !== WalletPreference.MANAGED && walletPreference !== WalletPreference.PRIVATE) {
      toast.error("Wallet preference is not configured. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);

    let topicId;
    try {
      topicId = await service.getNextClaimTopicId();
    } catch (e) {
      console.error("Failed to reserve next compliance rule ID:", e);
      toast.error("Could not reserve a compliance rule ID. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const createPromise = (async () => {
      let txhash;
      if (walletPreference === WalletPreference.MANAGED) {
        const { initiateResponse, error: initError } = await DfnsService.initiateAddClaimTopic(topicId, user.walletId, dfnsToken);
        if (initError) throw new Error(initError);
        if (!initiateResponse?.challenge || !initiateResponse?.requestBody) {
          throw new Error("Unexpected response from DFNS initiateAddClaimTopic");
        }

        const { completeResponse, error: completeError } = await DfnsService.completeAddClaimTopic(
          user.walletId,
          dfnsToken,
          initiateResponse.challenge,
          initiateResponse.requestBody
        );
        if (completeError) throw new Error(completeError);
        txhash = completeResponse?.transactionHash;
      } else {
        txhash = await service.addClaimTopic(topicId);
      }

      if (!txhash) {
        throw new Error("Compliance rule transaction hash was not returned; cannot link the on-chain record to its display name.");
      }

      try {
        await service.updateClaimTopic(txhash, {
          topic: String(topicId),
          displayName: trimmedDisplayName,
        });
      } catch (err) {
        const reason = err?.message ?? String(err);
        throw new Error(
          `Compliance rule ${topicId} was created on-chain, but saving its display name failed: ${reason}. You can set the name from the compliance rules list.`
        );
      }
    })();

    toast
      .promise(createPromise, {
        pending: "Creating Compliance Rule...",
        success: `Successfully created ${trimmedDisplayName} compliance rule`,
        error: {
          render: ({ data }) => `Failed to create ${trimmedDisplayName}: ${data?.message ?? "unknown error"}`,
        },
      })
      .then(() => {
        navigate("/topics");
      })
      .catch((error) => {
        console.error("Error creating compliance rule:", error);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  useEffect(() => {
    getNextClaimTopicId();
  }, [getNextClaimTopicId]);

  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[{ title: <Link to={"/"}>Home</Link> }, { title: <Link to={"/topics"}>Compliance Rules</Link> }, { title: "Add" }]}
      />
      <p className="text-xl p-6">Create Compliance Rule</p>
      <hr />
      <div className="p-3 mt-2">
        <div>
          <label htmlFor="claimTopicDisplayName">Compliance Rule Display Name *</label>
          <div className="mt-3 ml-1 relative w-full flex border rounded-lg p-0">
            <Input
              id="claimTopicDisplayName"
              value={displayName}
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="Enter Display Name"
              type="text"
              maxLength={32}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="absolute right-5 top-3">{displayName.length}/32</p>
          </div>
          <p>User-friendly name that describes the schema. Shown to end-users.</p>
        </div>
        <div className="mt-10 mb-6">
          <label htmlFor="claimTopicHiddenName">TopicID hidden name *</label>
          <div className="mt-3 ml-1 relative w-full flex border rounded-lg p-0">
            <Input
              id="claimTopicHiddenName"
              value={hiddenName}
              readOnly
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="1"
              type="text"
              style={{ backgroundColor: "white", cursor: "default" }}
            />
          </div>
          <p>Only alphanumeric characters allowed and no spaces. Not seen by end-users.</p>
        </div>
        <div className="flex justify-end max-[600px]:justify-center">
          <Button
            className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
            onClick={saveClaimTopic}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Create Compliance Rule
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateClaimTopic;
