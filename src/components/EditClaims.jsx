import React, { useEffect, useState, useContext } from "react";

import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Input, Transfer, Modal, message } from "antd";
import { Link, useParams, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import UserService from "../services/UserService";
import { isEthereumAddress } from "../utils";
import { WalletPreference } from "../utils/Constants";

const EditClaims = ({ service }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { identityId } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const userEmail = searchParams.get("email") || null;
  const [identity, setIdentity] = useState({});
  const [claimTopics, setClaimTopics] = useState([]);
  const [targetKeys, setTargetKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [secondaryWallets, setSecondaryWallets] = useState([]);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [walletForm, setWalletForm] = useState({ walletAddress: "" });
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [refreshingWallet, setRefreshingWallet] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);

  // Handling the transfer box for compliance rules
  const onChange = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const onSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  // Helper function to extract error message
  const getErrorMessage = (error) => {
    if (typeof error === "string") return error;
    if (error?.reason) return error.reason;
    if (error?.message) return error.message;
    if (error?.toString) return error.toString();
    return "An unknown error occurred";
  };

  // Secondary Wallet Handlers

  useEffect(() => {
    if (userEmail) {
      fetchUserWallets();
    }
  }, [userEmail]);

  const fetchUserWallets = async () => {
    if (!userEmail) return;

    setLoadingWallets(true);
    try {
      const wallets = await UserService.getUserWallets(userEmail);
      setSecondaryWallets(wallets || []);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      // Don't show error message on initial load, wallets might not exist yet
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleAddWallet = () => {
    setEditingWallet(null);
    setWalletForm({
      walletAddress: "",
    });
    setIsWalletModalVisible(true);
  };

  const handleEditWallet = (wallet) => {
    setEditingWallet(wallet);
    setWalletForm({
      walletAddress: wallet.walletAddress,
    });
    setIsWalletModalVisible(true);
  };

  const handleSaveWallet = async () => {
    if (!walletForm.walletAddress) {
      message.error("Wallet Address is required");
      return;
    }

    if (!isEthereumAddress(walletForm.walletAddress)) {
      message.error("Invalid Ethereum Wallet Address");
      return;
    }

    const isDuplicate = secondaryWallets.some((wallet) => {
      if (editingWallet && wallet.walletAddress === editingWallet.walletAddress) {
        return false;
      }
      return wallet.walletAddress.toLowerCase() === walletForm.walletAddress.toLowerCase();
    });

    if (isDuplicate) {
      message.error("This wallet address already exists");
      return;
    }

    try {
      if (!identity?.address) {
        message.warning("Identity address not available. Wallet will be saved locally.");
        if (editingWallet) {
          const updatedWallets = secondaryWallets.map((w) => (w === editingWallet ? { ...walletForm } : w));
          setSecondaryWallets(updatedWallets);
          message.success("Wallet updated locally");
        } else {
          setSecondaryWallets([...secondaryWallets, { ...walletForm }]);
          message.success("Wallet added locally");
        }
      } else {
        setIsProcessing(true);
        const { initiateResponse, error: initError } = await DfnsService.initiateLinkWallet(
          identity.address,
          walletForm.walletAddress,
          user.walletId,
          dfnsToken
        );

        if (initError) throw new Error(initError);

        const { completeResponse, error: completeError } = await DfnsService.completeLinkWallet(
          user.walletId,
          dfnsToken,
          initiateResponse.challenge,
          initiateResponse.requestBody
        );

        if (completeError) throw new Error(completeError);

        message.success("Wallet linked successfully");
        await fetchUserWallets();
      }

      setIsWalletModalVisible(false);
      setEditingWallet(null);
    } catch (error) {
      console.error("Error linking wallet:", error);
      message.error("Failed to link wallet");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteWallet = async (wallet) => {
    Modal.confirm({
      title: "Unlink Wallet",
      content: "Are you sure you want to unlink this wallet?",
      okText: "Unlink",
      okType: "danger",
      onOk: async () => {
        try {
          if (!identity?.address) {
            message.error("Identity address not available");
            return;
          }

          setIsProcessing(true);
          const { initiateResponse, error: initError } = await DfnsService.initiateUnlinkWallet(
            identity.address,
            wallet.walletAddress,
            user.walletId,
            dfnsToken
          );

          if (initError) throw new Error(initError);

          const { completeResponse, error: completeError } = await DfnsService.completeUnlinkWallet(
            user.walletId,
            dfnsToken,
            initiateResponse.challenge,
            initiateResponse.requestBody
          );

          if (completeError) throw new Error(completeError);

          message.success("Wallet unlinked successfully");
          await fetchUserWallets();
        } catch (error) {
          console.error("Error unlinking wallet:", error);
          message.error("Failed to unlink wallet");
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleRefreshWallet = async () => {
    if (!userEmail) {
      message.warning("User email not available. Please save the identity first.");
      return;
    }

    setRefreshingWallet(true);
    try {
      const result = await UserService.fetchAndStoreSecondaryWallet(userEmail);

      if (result.noDataFound) {
        message.warning("Secondary wallet record does not exist. Please contact T7X support.");
        // Show instruction to create manually
        Modal.info({
          title: "No Wallet Found",
          content: (
            <div>
              <p>No secondary wallet was found in the system for this user.</p>
              <p className="mt-2">You can manually create secondary wallet information using the "Add Wallet" button below.</p>
            </div>
          ),
        });
      } else if (result.success) {
        message.success(result.message);
        await fetchUserWallets();
      }
    } catch (error) {
      console.error("Error refreshing wallet:", error);
      message.error("Failed to refresh wallet. Please try again.");
    } finally {
      setRefreshingWallet(false);
    }
  };

  // Save the selected compliance rules
  const saveClaims = async () => {
    if (!secondaryWallets || secondaryWallets.length === 0) {
      toast.error("At least one secondary wallet is required");
      return;
    }

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
                try {
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
                } catch (error) {
                  console.error("Error in remove claim operation:", error);
                  throw error;
                }
              })(),
              {
                pending: `Removing claim ${claimTopic.topic}...`,
                success: `Successfully removed claim ${claimTopic.topic}`,
                error: {
                  render({ data }) {
                    const errorMessage = getErrorMessage(data);
                    return (
                      <div>
                        Error removing claim {claimTopic.topic}: {errorMessage}
                      </div>
                    );
                  },
                },
              }
            )
            .catch((error) => {
              console.error("Error after attempting to remove claim:", error);
              // Re-throw to prevent continuing with the operation
              throw error;
            });
        } else if (walletPreference === WalletPreference.PRIVATE) {
          await toast.promise(service.removeClaim(identity.address, claimTopic), {
            pending: `Removing claim ${claimTopic.topic}...`,
            success: `Successfully removed claim ${claimTopic.topic}`,
            error: {
              render({ data }) {
                const errorMessage = getErrorMessage(data);
                return (
                  <div>
                    Error removing claim {claimTopic.topic}: {errorMessage}
                  </div>
                );
              },
            },
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
                try {
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
                  await delay(4000);
                  //navigate(/identities/${JSON.stringify({ data: claimResponse })}/edit/summary);
                  navigate("/identities");
                } catch (error) {
                  console.error("Error in set claims operation:", error);
                  throw error;
                }
              })(),
              {
                pending: "Adding new claims...",
                success: `Successfully added new claims`,
                error: {
                  render({ data }) {
                    const errorMessage = getErrorMessage(data);
                    return <div>{errorMessage}</div>;
                  },
                },
              }
            )
            .catch((error) => {
              console.error("Error after attempting to set claim:", error);
              // Don't re-throw here as we want to show the error but not crash
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
                console.error("Error in private wallet set claims:", error);
                throw error;
              }
            },
            {
              pending: "Adding new claims...",
              success: "Successfully added new claims.",
              error: {
                render({ data }) {
                  const errorMessage = getErrorMessage(data);
                  return <div>{errorMessage}</div>;
                },
              },
            }
          );
        }
      } else {
        // Only show if there were no claims to remove either
        if (claimsToRemove.length === 0) {
          toast.info("No changes to save.");
        } else {
          toast.success("Claims updated successfully.");
        }
      }
    } catch (error) {
      console.error("Error in saveClaims:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(`Failed to save claims for ${identity.displayName}: ${errorMessage}`);
    }
  };

  // Fetch compliance rules and identity details on component mount
  useEffect(() => {
    (async function () {
      try {
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
      } catch (error) {
        console.error("Error loading data:", error);
        const errorMessage = getErrorMessage(error);
        toast.error(`Failed to load data: ${errorMessage}`);
      }
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
            value={identity?.displayName || ""}
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
            value={identity?.accountNumber || ""}
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
            value={identity?.address || ""}
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
          className="flex items-center gap-2 min-w-max text-center font-semibold rounded-2xl !p-4 h-fit bg-[#7F56D9] text-white mr-11"
        >
          <div>Save Claims</div>
        </Button>
      </div>

      {/* Secondary Wallets Section */}
      <div className="mt-6 mb-6 w-[100%] max-[600px]:w-full border p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-lg font-semibold">
              Secondary Wallets <span className="text-red-500">*</span>
            </p>
            <p className="text-sm text-gray-500">
              {userEmail ? "Manage additional wallets for this identity" : "Add wallets locally. They will be saved after identity creation."}
            </p>
          </div>
          <div className="flex gap-2">
            {userEmail && secondaryWallets.length === 0 && !loadingWallets && (
              <Button type="default" icon={<ReloadOutlined />} loading={refreshingWallet} onClick={handleRefreshWallet} disabled={isProcessing}>
                Fetch Secondary Wallet
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWallet} className="bg-[#9952b3]" disabled={isProcessing}>
              Add Wallet
            </Button>
          </div>
        </div>

        {loadingWallets ? (
          <div className="text-center py-8">Loading wallets...</div>
        ) : secondaryWallets.length === 0 ? (
          <div className="border rounded-xl p-6 bg-gray-50 text-center">
            <p className="text-gray-500 mb-2">No secondary wallets found</p>
            <p className="text-sm text-gray-400">
              {userEmail
                ? "Click 'Fetch Secondary Wallet' to fetch from the system or 'Add Wallet' to create manually"
                : "Click 'Add Wallet' to add secondary wallets for this identity"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {secondaryWallets.map((wallet, index) => (
              <div key={wallet.walletAddress || index} className="border rounded-xl p-4 bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">Wallet Address:</span>
                      <span className="text-gray-600 font-mono text-sm">{wallet.walletAddress}</span>
                      {!wallet.walletAddress && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Not saved yet</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEditWallet(wallet)} disabled={isProcessing} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteWallet(wallet)} disabled={isProcessing} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wallet Modal */}
      <Modal
        title={editingWallet ? "Edit Secondary Wallet" : "Add Secondary Wallet"}
        open={isWalletModalVisible}
        onOk={handleSaveWallet}
        onCancel={() => {
          setIsWalletModalVisible(false);
          setEditingWallet(null);
        }}
        okText={editingWallet ? "Update" : "Add"}
        okButtonProps={{ className: "bg-[#9952b3]" }}
      >
        <div className="flex flex-col gap-4 mt-4">
          <div>
            <label htmlFor="modalWalletAddress" className="block mb-2">
              Wallet Address <span className="text-red-500">*</span>
            </label>
            <Input
              id="modalWalletAddress"
              value={walletForm.walletAddress}
              onChange={(e) => setWalletForm({ ...walletForm, walletAddress: e.target.value })}
              placeholder="Enter wallet address (0x...)"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EditClaims;
