import React, { useCallback, useEffect, useContext } from "react";

import { Breadcrumb, Button, Input } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isAlphanumericAndSpace, awaitTimeout } from "../utils";
import { WalletPreference } from "../utils/Constants";

function CreateClaimTopic({ service }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = React.useState("");
  const [hiddenName, setHiddenName] = React.useState(0);
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

    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Initiate adding the claim topic
              const { initiateResponse, error: initError } = await DfnsService.initiateAddClaimTopic(hiddenName, user.walletId, dfnsToken);
              if (initError) throw new Error(initError);

              // Complete adding the claim topic
              const { completeResponse, error: completeError } = await DfnsService.completeAddClaimTopic(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              // Update the claim topic
              await service.updateClaimTopic({
                topic: String(hiddenName),
                displayName: trimmedDisplayName,
              });
              // Navigate to topics after everything is successfully executed
              navigate("/topics");
            })(),
            {
              pending: "Creating Compliance Rule...",
              success: `Successfully created Compliance Rule ${hiddenName}`,
              error: `An error occurred while Creating Compliance Rule ${hiddenName}`,
            }
          )
          .catch((error) => {
            console.error("Error after attempting to create compliance rule:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              await service.addClaimTopic(hiddenName);
              await service.updateClaimTopic({
                topic: String(hiddenName),
                displayName: trimmedDisplayName,
              });
            })(),
            {
              pending: "Creating Compliance Rule...",
              success: `Successfully created Compliance Rule ${hiddenName}`,
              error: `An error occurred while creating Compliance Rule ${hiddenName}`,
            }
          )
          .then(() => {
            setTimeout(() => {
              navigate("/topics");
            }, 500); // Delay navigation to ensure the success toast has time to display
          })
          .catch((error) => {
            console.error("Error after attempting to create compliance rule:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during compliance rule creation:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  useEffect(() => {
    getNextClaimTopicId();
  }, [service, getNextClaimTopicId]);

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
              onChange={(e) => setHiddenName(e.target.value)}
            />
          </div>
          <p>Only alphanumeric characters allowed and no spaces. Not seen by end-users.</p>
        </div>
        <div className="flex justify-end max-[600px]:justify-center">
          <Button className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white" onClick={saveClaimTopic}>
            Create Compliance Rule
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateClaimTopic;
