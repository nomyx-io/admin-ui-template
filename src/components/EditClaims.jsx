import React, { useEffect, useState, useContext } from "react";

import { Breadcrumb, Button, Input, Transfer } from "antd";
import { Link, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { WalletPreference } from "../utils/Constants";

const EditClaims = ({ service }) => {
  const navigate = useNavigate();
  const { identityId } = useParams();
  const [identity, setIdentity] = useState({});
  const [claimTopics, setClaimTopics] = useState([]);
  const [targetKeys, setTargetKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  // Handling the transfer box for compliance rules
  const onChange = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const onSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  // Save the selected compliance rules
  const saveClaims = async () => {
    const currentClaims = identity.claims || [];
    const selectedClaimTopics = targetKeys;
    // Claims that are selected but were not already part of the current claims
    const claimsToRemove = currentClaims.filter((claim) => !selectedClaimTopics.includes(claim));
    // Claims that are new and weren't in current claims
    const claimsToAdd = selectedClaimTopics.filter((claim) => !currentClaims.includes(claim));

    try {
      // Remove the claims that are not selected anymore
      // First, remove all claims sequentially
      for (let claimTopic of claimsToRemove) {
        if (walletPreference === WalletPreference.MANAGED) {
          await toast
            .promise(
              (async () => {
                // Initiate remove claim
                const { initiateResponse, error: initError } = await DfnsService.initiateRemoveClaim(
                  identity.address,
                  parseInt(claimTopic.topic),
                  user.walletId,
                  dfnsToken
                );
                if (initError) throw new Error(initError);

                // Complete remove claim
                const { completeResponse, error: completeError } = await DfnsService.completeRemoveClaim(
                  user.walletId,
                  dfnsToken,
                  initiateResponse.challenge,
                  initiateResponse.requestBody
                );
                if (completeError) throw new Error(completeError);

                return completeResponse;
              })(),
              {
                pending: `Removing claim ${claimTopic.topic}...`,
                success: `Successfully removed claim ${claimTopic.topic}`,
                error: `Error removing claim ${claimTopic.topic}`,
              }
            )
            .catch((error) => {
              console.error("Error after attempting to remove claim:", error);
            });
        } else if (walletPreference === WalletPreference.PRIVATE) {
          await toast.promise(service.removeClaim(identity.address, claimTopic), {
            pending: `Removing claim ${claimTopic.topic}...`,
            success: `Successfully removed claim ${claimTopic.topic}`,
            error: `Error removing claim ${claimTopic.topic}`,
          });
        }
      }

      // After successfully removing claims, check if there are claims to add
      if (claimsToAdd.length > 0) {
        if (walletPreference === WalletPreference.MANAGED) {
          const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          await toast
            .promise(
              (async () => {
                // Initiate set claim
                const { initiateResponse, error: initError } = await DfnsService.initiateSetClaims(
                  identity.address,
                  claimsToAdd,
                  user.walletId,
                  dfnsToken
                );
                if (initError) throw new Error(initError);

                await delay(2000);
                // Complete set claim
                const { completeResponse, error: completeError } = await DfnsService.completeSetClaims(
                  user.walletId,
                  dfnsToken,
                  initiateResponse.challenge,
                  initiateResponse.requestBody
                );
                if (completeError) throw new Error(completeError);

                let claimResponse = {
                  events: [
                    {
                      transactionHash: completeResponse?.transactionHash,
                    },
                  ],
                };
                await delay(3000);
                //navigate(/identities/${JSON.stringify({ data: claimResponse })}/edit/summary);
                navigate("/identities");
              })(),
              {
                pending: "Adding new claims...",
                success: `Successfully added new claims`,
                error: {
                  render({ data }) {
                    return <div>{data?.reason || data || "Error adding claims"}</div>;
                  },
                },
              }
            )
            .catch((error) => {
              console.error("Error after attempting to set claim:", error);
            });
        } else if (walletPreference === WalletPreference.PRIVATE) {
          await toast.promise(
            async () => {
              try {
                const response = await service.setClaims(identity.address, claimsToAdd);
                const updatedIdentity = await service.getDigitalIdentity(identityId);
                setIdentity(updatedIdentity);
                setTargetKeys(updatedIdentity?.claims.map((t) => t.topic) || []);
                navigate(`/identities/${JSON.stringify({ data: response })}/edit/summary`);
              } catch (error) {
                throw error;
              }
            },
            {
              pending: "Adding new claims...",
              success: "Successfully added new claims.",
              error: {
                render({ data }) {
                  return <div>{data?.reason || data || "Error adding claims"}</div>;
                },
              },
            }
          );
        }
      } else {
        toast.error("No new claims to add.");
      }
    } catch (error) {
      toast.error(`Failed to save claims for ${identity.displayName}`);
    }
  };

  // Fetch compliance rules and identity details on component mount
  useEffect(() => {
    (async function () {
      const result = await service.getClaimTopics();
      let data = [];

      if (result) {
        // Map compliance rules to the format required by the Transfer component
        data = result.map((item) => ({
          key: item.attributes.topic,
          displayName: item.attributes.displayName,
          topic: item.attributes.topic,
        }));
        setClaimTopics(data);
      }

      // Fetch the identity details
      let identityRecord = await service.getDigitalIdentity(identityId);
      // Set identity and the initial target keys (current claims)
      const identityClaims = identityRecord?.claims || [];
      setIdentity(identityRecord);
      setTargetKeys(identityClaims.map((t) => t.topic));
    })();
  }, [service, identityId]);

  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[
          {
            title: <Link to={"/"}>Home</Link>,
          },
          {
            title: <Link to={"/identities"}>Identities</Link>,
          },
          {
            title: <Link to={`/identities/${identityId}`}>{identityId}</Link>,
          },
          {
            title: "Edit",
          },
        ]}
      />
      <div className="text-2xl py-2">Edit Rules for Selected ID</div>
      <div className="flex flex-col items-center">
        <div className="w-full">
          <div>Select Rules</div>
          <Transfer
            className="w-full"
            showSelectAll={false}
            dataSource={claimTopics}
            titles={["Available Topics", "Selected Topics"]}
            targetKeys={targetKeys}
            selectedKeys={selectedKeys}
            onChange={onChange}
            onSelectChange={onSelectChange}
            render={(item) => (
              <div>
                {item?.displayName} ({item.topic})
              </div>
            )}
            listStyle={{ width: "50%", minWidth: "120px" }}
          />
        </div>
      </div>
      <br />
      <div className="p-6 border rounded-xl">
        <div>
          <label htmlFor="investorName">Investor Name</label>
          <Input
            id="investorName"
            value={identity?.displayName}
            className="border w-full p-2 rounded-lg text-xl"
            placeholder="Name"
            type="text"
            readOnly
          />
        </div>

        <div className="my-3">
          <label htmlFor="investorAccountNumber">Investor KYC Account Number</label>
          <Input
            id="investorAccountNumber"
            value={identity?.accountNumber}
            className="border w-full p-2 rounded-lg text-xl"
            placeholder="KYC Account Number"
            type="text"
            readOnly
          />
        </div>
        <div className="my-3">
          <label htmlFor="investorWalletAddress">Investor Wallet Address</label>
          <Input
            id="investorWalletAddress"
            value={identity?.address}
            className="border w-full p-2 rounded-lg text-xl"
            placeholder="Wallet Address"
            type="text"
            readOnly
          />
        </div>
      </div>
      <br />
      <div className="flex justify-end gap-4">
        <Button
          onClick={saveClaims}
          className="flex items-center gap-2 min-w-max text-center font-semibold rounded-2xl p-2 h-fit bg-[#7F56D9] text-white"
        >
          <div>Save Claims</div>
        </Button>
      </div>
    </div>
  );
};

export default EditClaims;
