import React, { useEffect } from "react";

import { Breadcrumb, Button, Input, Select } from "antd";
import { Transfer } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isAlphanumericAndSpace, isEthereumAddress, awaitTimeout } from "../utils";
import { WalletPreference } from "../utils/Constants";

function CreateTrustedIssuer({ service }) {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [walletAddress, setWalletAddress] = React.useState("");
  const [users, setUsers] = React.useState([]);
  const [claimTopics, setClaimTopics] = React.useState([]);
  const [targetKeys, setTargetKeys] = React.useState([]);
  const [selectedKeys, setSelectedKeys] = React.useState([]);
  const location = useLocation();

  const { walletPreference, user, dfnsToken } = React.useContext(RoleContext);

  let id = location.pathname.split("/")[2];

  // Fetch users from Parse
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const Parse = require("parse");
        const query = new Parse.Query("_User");
        query.select(["firstName", "lastName", "walletAddress"]);
        const results = await query.find();
        const userData = results.map((user) => ({
          value: user.get("walletAddress"),
          label: `${user.get("firstName")} ${user.get("lastName")}`,
        }));
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users list");
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    (async function () {
      if (service.getClaimTopics && service.getTrustedIssuersByObjectId) {
        const result = await service.getClaimTopics();
        const issuerData = await service?.getTrustedIssuersByObjectId(id);
        if (issuerData) {
          const issuer = issuerData.attributes?.issuer || "";
          setSelectedUser({
            label: issuerData.attributes?.verifierName || "",
            value: issuer,
          });
          setWalletAddress(issuer);
        }
        let newArr = [];
        setTargetKeys(newArr || "");
        let data = [];

        if (result) {
          result.forEach((item) => {
            data.push({
              key: item.attributes?.topic,
              displayName: item.attributes?.displayName,
              id: item.id,
              topic: item.attributes?.topic,
            });
          });
          setClaimTopics(data);
        }
      }
    })();
  }, [service, id]);

  const onChange = (nextTargetKeys, direction, moveKeys) => {
    setTargetKeys(nextTargetKeys);
  };
  const onSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  function validateTrustedIssuer(selectedUser, targetKeys) {
    if (!selectedUser) {
      toast.error("Please select a Trusted Issuer");
      return false;
    }

    if (targetKeys.length < 1) {
      toast.error("Assign Atleast 1 Compliance Rule");
      return false;
    }

    return true && isEthereumAddress(selectedUser.value);
  }

  const saveTrustedIssuer = async () => {
    if (!validateTrustedIssuer(selectedUser, targetKeys)) {
      return;
    }

    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Initiate adding the trusted issuer
              const { initiateResponse, error: initError } = await DfnsService.initiateAddTrustedIssuer(
                selectedUser.value,
                targetKeys,
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              // Complete adding the trusted issuer
              const { completeResponse, error: completeError } = await DfnsService.completeAddTrustedIssuer(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);
              await new Promise((resolve) => setTimeout(resolve, 6000)); // 4-second delay
              //return completeResponse;
              await service.updateTrustedIssuer({
                verifierName: selectedUser.label,
                issuer: selectedUser.value,
                claimTopics: targetKeys.map((topic) => ({ topic, timestamp: Date.now() })), // Assuming you want to add timestamps
              });
              navigate("/issuers");
            })(),
            {
              pending: "Adding Trusted Issuer...",
              success: `Successfully Added Trusted Issuer ${selectedUser.label}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while adding Trusted Issuer ${selectedUser.label}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to add Trusted Issuer:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              await service.addTrustedIssuer(selectedUser.value, targetKeys);
              await service.updateTrustedIssuer({
                verifierName: selectedUser.label,
                issuer: selectedUser.value,
                claimTopics: targetKeys.map((topic) => ({ topic, timestamp: Date.now() })), // Assuming you want to add timestamps
              });
            })(),
            {
              pending: "Adding Trusted Issuer...",
              success: `Successfully Added Trusted Issuer ${selectedUser.label}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while adding Trusted Issuer ${selectedUser.label}`}</div>;
                },
              },
            }
          )
          .then(() => {
            navigate("/issuers");
          })
          .catch((error) => {
            console.error("Error after attempting to add Trusted Issuer:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during saveTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const updateTrustedIssuer = async () => {
    if (!validateTrustedIssuer(selectedUser, targetKeys)) {
      return;
    }

    try {
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        toast
          .promise(
            (async () => {
              // Initiate updating the trusted issuer
              const { initiateResponse, error: initError } = await DfnsService.initiateUpdateTrustedIssuer(
                selectedUser.value,
                targetKeys,
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              // Complete updating the trusted issuer
              const { completeResponse, error: completeError } = await DfnsService.completeUpdateTrustedIssuer(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              await delay(6000);
              navigate("/issuers");
            })(),
            {
              pending: "Updating Trusted Issuer...",
              success: `Successfully Updated Trusted Issuer ${selectedUser.label}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while updating Trusted Issuer ${selectedUser.label}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to update Trusted Issuer:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        // Handle PRIVATE wallet preference
        toast
          .promise(
            (async () => {
              const keysWithTimestamps = targetKeys.map((topic) => ({
                topic,
                timestamp: Date.now(),
              }));
              await service.updateIssuerClaimTopics(selectedUser.value, targetKeys);
              await service.updateTrustedIssuer({
                verifierName: selectedUser.label,
                issuer: selectedUser.value,
                claimTopics: keysWithTimestamps,
              });
            })(),
            {
              pending: "Updating Trusted Issuer...",
              success: `Successfully Updated Trusted Issuer ${selectedUser.label}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while updating Trusted Issuer ${selectedUser.label}`}</div>;
                },
              },
            }
          )
          .then(() => {
            navigate("/issuers");
          })
          .catch((error) => {
            console.error("Error after attempting to update Trusted Issuer:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during updateTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div>
      <Breadcrumb
        className="bg-transparent"
        items={[
          {
            title: <Link to={"/"}>Home</Link>,
          },
          {
            title: <Link to={"/issuers"}>Trusted Issuer</Link>,
          },
          {
            title: id === "create" ? "Add" : "Update",
          },
        ]}
      />
      <p className="text-xl p-6">Create Trusted Issuer</p>
      <hr></hr>
      <div className="p-6 mt-2">
        <div className="mb-6">
          <label htmlFor="trustedIssuer">Trusted Issuer display name *</label>
          <div className="mt-3">
            {id === "create" ? (
              <Select
                id="trustedIssuer"
                className="w-full text-xl"
                placeholder="Select a user"
                options={users}
                onChange={(value, option) => {
                  setSelectedUser(option);
                  setWalletAddress(option.value);
                }}
                disabled={id !== "create"}
              />
            ) : (
              <Input
                id="trustedIssuer"
                value={selectedUser?.label || ""}
                className="border w-full p-2 rounded-lg text-xl"
                placeholder="Trusted Issuer"
                type="text"
                disabled
              />
            )}
          </div>
        </div>
        <div className="mb-6">
          <label htmlFor="trustedIssuerWallet">Wallet Address</label>
          <div className="mt-3">
            <Input
              id="trustedIssuerWallet"
              value={walletAddress}
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="Wallet Address"
              type="text"
              disabled
            />
          </div>
          <p className="my-4">Manage Compliance Rule IDs</p>
        </div>
        <div className="my-5">
          <Transfer
            className="w-full"
            showSelectAll={false}
            dataSource={claimTopics}
            titles={["Available Claims", "Selected Claims"]}
            targetKeys={targetKeys}
            selectedKeys={selectedKeys}
            onChange={onChange}
            onSelectChange={onSelectChange}
            render={(item) => (
              <div>
                {item?.displayName}({item.topic})
              </div>
            )}
            listStyle={{ width: "50%", minWidth: "120px" }}
          />
        </div>
        <div className="flex justify-end max-[600px]:justify-center">
          {id === "create" ? (
            <Button
              className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
              onClick={saveTrustedIssuer}
            >
              Create Trusted Issuer
            </Button>
          ) : (
            <Button
              className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
              onClick={updateTrustedIssuer}
            >
              Update Trusted Issuer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateTrustedIssuer;
