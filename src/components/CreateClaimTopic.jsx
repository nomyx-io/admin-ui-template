import { Breadcrumb, Button, Input } from "antd";
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { isAlphanumericAndSpace, awaitTimeout } from "../utils";

function CreateClaimTopic({ service }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = React.useState("");
  const [hiddenName, setHiddenName] = React.useState(0);

  const getNextClaimTopicId = async () => {
    try {
      const nextClaimTopicId = await service.getNextClaimTopicId();
      setHiddenName(nextClaimTopicId);
      setDisplayName("");
    } catch (e) {
      console.error("Failed to get next claim topic ID:", e);
      toast.error("Failed to load initial data");
    }
  };

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
    if (validateClaimTopic(trimmedDisplayName)) {
      toast.promise(
        new Promise(async (resolve, reject) => {
          try {
            await service.addClaimTopic(hiddenName);
            await awaitTimeout(10000);  // Simulating a delay for the process
            await service.updateClaimTopic({
              topic: String(hiddenName),
              displayName: trimmedDisplayName,
            });
            resolve();
          } catch (e) {
            console.error("Failed to create/update claim topic:", e);
            reject(e);
          }
        }),
        {
          pending: "Creating Claim Topic...",
          success: `Successfully created Claim Topic ${hiddenName}`,
          error: `An error occurred while creating Claim Topic ${hiddenName}`,
        }
      ).then(() => {
        setTimeout(() => {
          navigate("/topics");
        }, 500); // Delay navigation to ensure the success toast has time to display
      }).catch((error) => {
        console.error("Error after attempting to create claim topic:", error);
      });
    }
  };

  useEffect(() => {
    getNextClaimTopicId();
  }, [service]);

  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[
          { title: <Link to={"/"}>Home</Link> },
          { title: <Link to={"/topics"}>Claim Topics</Link> },
          { title: "Add" },
        ]}
      />
      <p className="text-xl p-6">Create Claim Topic</p>
      <hr />
      <div className="p-3 mt-2">
        <div>
          <label htmlFor="claimTopicDisplayName">Claim Topic Display Name *</label>
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
          <Button
            className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
            onClick={saveClaimTopic}
          >
            Create Claim Topic
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateClaimTopic;
