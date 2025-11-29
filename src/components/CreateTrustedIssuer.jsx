import React, { useEffect, useState } from "react";

import { Button, Input, Select } from "antd";
import { Transfer } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isAlphanumericAndSpace, isEthereumAddress } from "../utils";
import { WalletPreference } from "../utils/Constants";

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

        const claimTopicsResult = await service.getClaimTopics();
        const usersResult = await fetchUsers();

        let issuerData = null;
        if (!isCreateMode) {
          issuerData = await service.getTrustedIssuersByObjectId(id);
        }

        if (isMounted) {
          if (claimTopicsResult) {
            const formattedClaimTopics = claimTopicsResult.map((item) => ({
              key: item.attributes?.topic,
              displayName: item.attributes?.displayName,
              id: item.id,
              topic: item.attributes?.topic,
            }));
            setClaimTopics(formattedClaimTopics);
          }

          if (usersResult) {
            setUsers(usersResult);
          }

          if (!isCreateMode && issuerData) {
            let rawVerifierName = issuerData?.attributes?.verifierName || issuerData?.get?.("verifierName") || issuerData?.verifierName || "";
            setVerifierName(rawVerifierName);

            let rawWalletAddress = issuerData?.attributes?.issuer || issuerData?.get?.("issuer") || issuerData?.issuer || "";
            setWalletAddress(rawWalletAddress);

            let existingClaimTopics = issuerData?.attributes?.claimTopics || issuerData?.get?.("claimTopics") || issuerData?.claimTopics || [];
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

    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      isMounted = false;
    };
  }, [service, id, isCreateMode]);

  const fetchUsers = async () => {
    try {
      const Parse = await import("parse").then((module) => module.default);
      const query = new Parse.Query("_User");
      query.exists("walletAddress");
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

  const onChange = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const onSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

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
        toast.promise(
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

            await new Promise((resolve) => setTimeout(resolve, 6000));

            await service.updateTrustedIssuer(updateData);
            navigate("/issuers");
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
        );
      } else if (walletPreference === WalletPreference.PRIVATE) {
        toast
          .promise(
            (async () => {
              await service.addTrustedIssuer(walletAddress, targetKeys);
              await service.updateTrustedIssuer(updateData);
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
        toast.promise(
          (async () => {
            const { initiateResponse, error: initError } = await DfnsService.initiateUpdateTrustedIssuer(
              walletAddress,
              targetKeys,
              user.walletId,
              dfnsToken
            );
            if (initError) throw new Error(initError);

            const { error: completeError } = await DfnsService.completeUpdateTrustedIssuer(
              user.walletId,
              dfnsToken,
              initiateResponse.challenge,
              initiateResponse.requestBody
            );
            if (completeError) throw new Error(completeError);

            await delay(6000);

            await service.updateTrustedIssuer(updateData);
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
        );
      } else if (walletPreference === WalletPreference.PRIVATE) {
        toast
          .promise(
            (async () => {
              await service.updateIssuerClaimTopics(walletAddress, targetKeys);
              await service.updateTrustedIssuer(updateData);
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
          });
      }
    } catch (error) {
      console.error("Unexpected error during updateTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 animate-fade-in-up">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="modern-card bg-white">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{isCreateMode ? "Create New" : "Update"} Trusted Issuer</h2>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">Configure verifier details and compliance rules</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Section 1: Basic Info */}
          <div data-tour="trusted-issuer-display-name" className="space-y-4">
            <label htmlFor="trustedIssuerName" className="block text-sm font-medium text-slate-700">
              Trusted Issuer Display Name <span className="text-red-500">*</span>
            </label>
            {isCreateMode ? (
              <Select
                showSearch
                className="w-full h-11"
                placeholder="Select a user"
                optionFilterProp="children"
                onChange={handleUserSelect}
                filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.displayName,
                }))}
              />
            ) : (
              <div className="relative w-full">
                <Input
                  id="trustedIssuerName"
                  value={verifierName}
                  className="w-full p-3 rounded-lg border border-gray-200 input-glow"
                  placeholder="ID Verifier Name"
                  type="text"
                  maxLength={32}
                  onChange={(e) => setVerifierName(e.target.value)}
                />
                <span className="absolute right-3 top-3 text-xs text-gray-400">{verifierName.length}/32</span>
              </div>
            )}
          </div>

          {/* Section 2: Wallet Info */}
          <div data-tour="trusted-issuer-wallet" className="space-y-4">
            <label htmlFor="trustedIssuerWallet" className="block text-sm font-medium text-slate-700">
              Trusted Issuer Wallet Address <span className="text-red-500">*</span>
            </label>
            <Input
              id="trustedIssuerWallet"
              value={walletAddress}
              className="w-full p-3 rounded-lg border border-gray-200 input-glow font-mono text-sm"
              placeholder="0x..."
              type="text"
              onChange={(e) => {
                if (isCreateMode && verifierName === "") {
                  setWalletAddress(e.target.value.trim());
                }
              }}
              disabled={!isCreateMode || verifierName !== ""}
            />
          </div>

          {/* Section 3: Compliance Rules */}
          <div data-tour="trusted-issuer-compliance-rules" className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Manage Compliance Rule IDs</h3>
            <div className="border border-gray-200 rounded-xl p-4 bg-slate-50">
              <Transfer
                className="custom-transfer"
                showSelectAll={false}
                dataSource={claimTopics}
                titles={["Available Claims", "Selected Claims"]}
                targetKeys={targetKeys}
                selectedKeys={selectedKeys}
                onChange={onChange}
                onSelectChange={onSelectChange}
                render={(item) => `${item?.displayName} (${item.topic})`}
                listStyle={{
                  width: "100%",
                  height: 300,
                  backgroundColor: "white",
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-6 border-t border-gray-100">
            <Button
              className="h-11 px-8 font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] border-none rounded-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
              onClick={isCreateMode ? saveTrustedIssuer : updateTrustedIssuer}
              disabled={!dataLoaded}
              loading={!dataLoaded}
              data-tour="create-trusted-issuer-submit"
            >
              {isCreateMode ? "Create Trusted Issuer" : "Update Trusted Issuer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateTrustedIssuer;
