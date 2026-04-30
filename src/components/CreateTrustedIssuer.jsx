import React, { useEffect, useState } from "react";

import { Breadcrumb, Button, Input, Select } from "antd";
import { Transfer } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isAlphanumericAndSpace, isEthereumAddress, awaitTimeout } from "../utils";
import { WalletPreference } from "../utils/Constants";
import { waitAndUpdate } from "../utils/indexerWait";

function CreateTrustedIssuer({ service }) {
  const navigate = useNavigate();
  const [verifierName, setVerifierName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [claimTopics, setClaimTopics] = useState([]);
  const [targetKeys, setTargetKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [users, setUsers] = useState([]);
  const location = useLocation();

  const { walletPreference, user, dfnsToken } = React.useContext(RoleContext);

  let id = location.pathname.split("/")[2];
  const isCreateMode = id === "create";

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout;

    const loadData = async () => {
      if (!service?.getClaimTopics || (!isCreateMode && !service?.getTrustedIssuersByObjectId)) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsLoading(true);
        }

        // Always fetch claim topics
        const claimTopicsResult = await service.getClaimTopics();

        // Fetch users for dropdown
        const usersResult = await fetchUsers();

        let issuerData = null;
        if (!isCreateMode) {
          issuerData = await service.getTrustedIssuersByObjectId(id);
        }

        // Update state immediately, don't wait
        if (isMounted) {
          // Set claim topics
          if (claimTopicsResult) {
            const formattedClaimTopics = claimTopicsResult.map((item) => ({
              key: item.attributes?.topic,
              displayName: item.attributes?.displayName,
              id: item.id,
              topic: item.attributes?.topic,
            }));
            setClaimTopics(formattedClaimTopics);
          }

          // Set users
          if (usersResult) {
            setUsers(usersResult);
          }

          // Set issuer data if in edit mode
          if (!isCreateMode && issuerData) {
            // Try multiple ways to extract verifier name
            let rawVerifierName = issuerData?.attributes?.verifierName;

            // If it's a Parse object, try the .get() method
            if (!rawVerifierName && issuerData?.get) {
              rawVerifierName = issuerData.get("verifierName");
            }

            // Try direct property access
            if (!rawVerifierName && issuerData?.verifierName) {
              rawVerifierName = issuerData.verifierName;
            }

            const finalVerifierName = rawVerifierName || "";
            setVerifierName(finalVerifierName);

            // Extract wallet address
            let rawWalletAddress = issuerData?.attributes?.issuer;
            if (!rawWalletAddress && issuerData?.get) {
              rawWalletAddress = issuerData.get("issuer");
            }
            if (!rawWalletAddress && issuerData?.issuer) {
              rawWalletAddress = issuerData.issuer;
            }

            const finalWalletAddress = rawWalletAddress || "";
            setWalletAddress(finalWalletAddress);

            // Extract claim topics
            let existingClaimTopics = issuerData?.attributes?.claimTopics;
            if (!existingClaimTopics && issuerData?.get) {
              existingClaimTopics = issuerData.get("claimTopics");
            }
            if (!existingClaimTopics && issuerData?.claimTopics) {
              existingClaimTopics = issuerData.claimTopics;
            }
            existingClaimTopics = existingClaimTopics || [];

            const existingTopicKeys = existingClaimTopics.map((claim) => {
              return typeof claim === "object" ? claim.topic : claim;
            });

            setTargetKeys(existingTopicKeys);
          } else if (isCreateMode) {
            setVerifierName("");
            setWalletAddress("");
            setTargetKeys([]);
          }

          setDataLoaded(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        if (isMounted) {
          setIsLoading(false);
          toast.error("Failed to load data. Please refresh the page.");
        }
      }
    };

    loadData();

    // Cleanup function
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      isMounted = false;
    };
  }, [service, id, isCreateMode]);

  // Function to fetch users from the _User table
  const fetchUsers = async () => {
    try {
      // Use ParseClient to get users with their first name, last name, and wallet address
      const Parse = await import("parse").then((module) => module.default);
      const query = new Parse.Query("_User");
      query.exists("walletAddress"); // Only get users with wallet address
      const results = await query.find();

      return results.map((user) => ({
        id: user.id,
        firstName: user.get("firstName") || "",
        lastName: user.get("lastName") || "",
        walletAddress: user.get("walletAddress") || "",
        displayName: `${user.get("firstName") || ""} ${user.get("lastName") || ""}`,
      }));
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  };

  const onChange = (nextTargetKeys, direction, moveKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const onSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  // Handle user selection from dropdown
  const handleUserSelect = (value) => {
    const selectedUser = users.find((user) => user.id === value);
    if (selectedUser) {
      setVerifierName(selectedUser.displayName);
      setWalletAddress(selectedUser.walletAddress);
    }
  };

  function validateTrustedIssuer(verifierName, walletAddress, targetKeys) {
    if (verifierName?.trim() === "") {
      toast.error("Trusted Issuer display Name is required");
      return false;
    }

    if (!isAlphanumericAndSpace(verifierName)) {
      toast.error("Trusted Issuer display Name must contain only alphanumeric characters");
      return false;
    }

    if (walletAddress === "") {
      toast.error("Trusted Issuer Wallet is required");
      return false;
    }

    if (!isEthereumAddress(walletAddress)) {
      toast.error("Invalid Ethereum Wallet Address in Trusted Issuer Wallet Address");
      return false;
    }

    if (targetKeys.length < 1) {
      toast.error("Assign Atleast 1 Compliance Rule");
      return false;
    }

    return true;
  }

  const saveTrustedIssuer = async () => {
    const trimmedVerifierName = verifierName.trim();

    if (!validateTrustedIssuer(trimmedVerifierName, walletAddress, targetKeys)) {
      return;
    }

    try {
      const updateData = {
        verifierName: trimmedVerifierName,
        issuer: walletAddress,
        claimTopics: targetKeys.map((topic) => ({ topic, timestamp: Date.now() })),
      };

      if (walletPreference === WalletPreference.MANAGED) {
        toast
          .promise(
            (async () => {
              const { initiateResponse, error: initError } = await DfnsService.initiateAddTrustedIssuer(
                walletAddress,
                targetKeys,
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              const { error: completeError } = await DfnsService.completeAddTrustedIssuer(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge,
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              // wait for the trusted issuer row to be indexed, then update
              await waitAndUpdate({
                fetchFn: () => service.getTrustedIssuerByAddress(walletAddress),
                updateFn: () => service.updateTrustedIssuer(updateData),
                resourceName: `Trusted Issuer ${walletAddress}`,
              });

              navigate("/issuers");
            })(),
            {
              pending: "Adding Trusted Issuer...",
              success: `Successfully Added Trusted Issuer ${walletAddress}`,
              error: {
                render({ data }) {
                  const msg =
                    data?.reason ||
                    data?.message ||
                    (typeof data === "string" ? data : null) ||
                    `An error occurred while adding Trusted Issuer ${walletAddress}`;
                  return <div>{msg}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error in saveTrustedIssuer (MANAGED):", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        toast
          .promise(
            (async () => {
              await service.addTrustedIssuer(walletAddress, targetKeys);
              const result = await service.updateTrustedIssuer(updateData);
            })(),
            {
              pending: "Adding Trusted Issuer...",
              success: `Successfully Added Trusted Issuer ${walletAddress}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while adding Trusted Issuer ${walletAddress}`}</div>;
                },
              },
            }
          )
          .then(() => {
            navigate("/issuers");
          })
          .catch((error) => {
            console.error("Error in saveTrustedIssuer (PRIVATE):", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during saveTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const updateTrustedIssuer = async () => {
    const trimmedVerifierName = verifierName.trim();

    if (!validateTrustedIssuer(trimmedVerifierName, walletAddress, targetKeys)) {
      return;
    }

    try {
      const updateData = {
        verifierName: trimmedVerifierName,
        issuer: walletAddress,
        claimTopics: targetKeys.map((topic) => ({ topic, timestamp: Date.now() })),
      };

      if (walletPreference === WalletPreference.MANAGED) {
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        toast
          .promise(
            (async () => {
              const { initiateResponse, error: initError } = await DfnsService.initiateUpdateTrustedIssuer(
                walletAddress,
                targetKeys,
                user.walletId,
                dfnsToken
              );
              if (initError) throw new Error(initError);

              const { completeResponse, error: completeError } = await DfnsService.completeUpdateTrustedIssuer(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge,
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);

              await waitAndUpdate({
                fetchFn: () => service.getTrustedIssuerByAddress(walletAddress),
                updateFn: () => service.updateTrustedIssuer(updateData),
                resourceName: `Trusted Issuer ${walletAddress}`,
              });
              navigate("/issuers");
            })(),
            {
              pending: "Updating Trusted Issuer...",
              success: `Successfully Updated Trusted Issuer ${walletAddress}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while updating Trusted Issuer ${walletAddress}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error in updateTrustedIssuer (MANAGED):", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE) {
        toast
          .promise(
            (async () => {
              const keysWithTimestamps = targetKeys.map((topic) => ({
                topic,
                timestamp: Date.now(),
              }));

              await service.updateIssuerClaimTopics(walletAddress, targetKeys);
              const result = await service.updateTrustedIssuer(updateData);
            })(),
            {
              pending: "Updating Trusted Issuer...",
              success: `Successfully Updated Trusted Issuer ${walletAddress}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while updating Trusted Issuer ${walletAddress}`}</div>;
                },
              },
            }
          )
          .then(() => {
            navigate("/issuers");
          })
          .catch((error) => {
            console.error("Error in updateTrustedIssuer (PRIVATE):", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during updateTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div>Loading...</div>
      </div>
    );
  }

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
            title: isCreateMode ? "Add" : "Update",
          },
        ]}
      />
      <p className="text-xl p-6">{isCreateMode ? "Create" : "Update"} Trusted Issuer</p>
      <hr></hr>
      <div className="p-6 mt-2">
        <div>
          <label htmlFor="trustedIssuerName">Trusted Issuer display name *</label>
          {isCreateMode ? (
            <div className="mt-3 mb-3">
              <Select
                showSearch
                style={{ width: "100%" }}
                placeholder="Select a user"
                optionFilterProp="children"
                onChange={handleUserSelect}
                filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.displayName,
                }))}
              />
            </div>
          ) : (
            <div className="mt-3 relative w-full flex border rounded-lg">
              <Input
                id="trustedIssuerName"
                value={verifierName}
                className="border w-full p-2 rounded-lg text-xl"
                placeholder="ID Verifier Name"
                type="text"
                maxLength={32}
                onChange={(e) => setVerifierName(e.target.value)}
              />
              <p className="absolute right-5 top-3">{verifierName.length}/32</p>
            </div>
          )}
        </div>
        <div className="mt-10 mb-6">
          <label htmlFor="trustedIssuerWallet">Trusted Issuer Wallet *</label>
          <div className="mt-3 relative w-full flex border rounded-lg">
            <Input
              id="trustedIssuerWallet"
              value={walletAddress}
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="Wallet Address"
              type="text"
              onChange={(e) => {
                if (isCreateMode && verifierName === "") {
                  setWalletAddress(e.target.value.trim());
                }
              }}
              disabled={!isCreateMode || verifierName !== ""}
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
          {isCreateMode ? (
            <Button
              className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
              onClick={saveTrustedIssuer}
              disabled={!dataLoaded}
            >
              Create Trusted Issuer
            </Button>
          ) : (
            <Button
              className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white"
              onClick={updateTrustedIssuer}
              disabled={!dataLoaded}
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
