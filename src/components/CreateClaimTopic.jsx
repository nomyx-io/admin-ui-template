import React, { useCallback, useEffect, useContext } from "react";

import { Button, Input } from "antd";
import { useNavigate, useParams, useLocation } from "../hooks/useNextRouter";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { isAlphanumericAndSpace, awaitTimeout } from "../utils";
import { WalletPreference } from "../utils/Constants";
import TransactionModal from "./shared/TransactionModal";
import WalletConnectionModal from "./WalletConnectionModal";
import PageCard from "./shared/PageCard";

function CreateClaimTopic({ service }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = React.useState("");
  const [hiddenName, setHiddenName] = React.useState(0);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);
  const [walletModalVisible, setWalletModalVisible] = React.useState(false);
  const [transactionModal, setTransactionModal] = React.useState({
    visible: false,
    status: 'loading',
    title: 'Creating Compliance Rule',
    loadingMessage: 'Adding compliance rule to blockchain...',
    successMessage: 'Compliance Rule created successfully!',
    errorMessage: ''
  });

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
    console.log("[CreateClaimTopic] saveClaimTopic called");
    console.log("[CreateClaimTopic] service:", service);
    console.log("[CreateClaimTopic] displayName:", displayName);
    console.log("[CreateClaimTopic] hiddenName:", hiddenName);
    
    const trimmedDisplayName = displayName.trim();

    if (!validateClaimTopic(trimmedDisplayName)) {
      console.log("[CreateClaimTopic] validation failed");
      return;
    }

    console.log("[CreateClaimTopic] validation passed, proceeding...");
    
    try {
      // Default to PRIVATE wallet preference if not set
      const effectiveWalletPreference = walletPreference ?? WalletPreference.PRIVATE;

      if (effectiveWalletPreference === WalletPreference.MANAGED) {
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
      } else {
        // Handle PRIVATE wallet preference (or null/default case)
        console.log(`[CreateClaimTopic] Using ${effectiveWalletPreference === WalletPreference.PRIVATE ? "PRIVATE" : "DEFAULT"} wallet mode`);
        console.log("[CreateClaimTopic] service.addClaimTopic exists?", typeof service.addClaimTopic);
        
        if (!service || typeof service.addClaimTopic !== 'function') {
          console.error("[CreateClaimTopic] Service not initialized or addClaimTopic method missing");
          toast.error("Service not initialized. Please wait and try again.");
          return;
        }
        
        // Show transaction modal
        setTransactionModal({
          visible: true,
          status: 'loading',
          title: 'Creating Compliance Rule',
          loadingMessage: 'Adding compliance rule to blockchain...',
          successMessage: '',
          errorMessage: ''
        });

        try {
          console.log(`[CreateClaimTopic] Calling service.addClaimTopic(${hiddenName}, "${trimmedDisplayName}")`);
          const result = await service.addClaimTopic(hiddenName, trimmedDisplayName);
          
          // Check if wallet connection is required
          if (result && result.requiresWallet) {
            console.log('[CreateClaimTopic] Wallet connection required');
            setTransactionModal({ visible: false });
            setWalletModalVisible(true);
            return;
          }

          // Update modal
          setTransactionModal(prev => ({
            ...prev,
            loadingMessage: 'Saving compliance rule details...'
          }));

          // Only call updateClaimTopic if the service has this method
          if (typeof service.updateClaimTopic === "function") {
            await service.updateClaimTopic({
              topic: String(hiddenName),
              displayName: trimmedDisplayName,
            });
          } else {
            console.log(`[CreateClaimTopic] updateClaimTopic method not available, skipping`);
          }

          // Show success
          setTransactionModal({
            visible: true,
            status: 'success',
            title: 'Success',
            loadingMessage: '',
            successMessage: `Successfully created Compliance Rule ${hiddenName}`,
            errorMessage: '',
            data: {
              'Topic ID': hiddenName,
              'Display Name': trimmedDisplayName,
              ...(result?.txHash ? {'Transaction Hash': result.txHash} : {}),
              ...(result?.transactionHash ? {'Transaction Hash': result.transactionHash} : {})
            }
          });

          // Navigate after a short delay
          setTimeout(() => {
            navigate("/topics");
          }, 2000);
          
        } catch (error) {
          console.error("Error creating compliance rule:", error);
          setTransactionModal({
            visible: true,
            status: 'error',
            title: 'Error',
            loadingMessage: '',
            successMessage: '',
            errorMessage: error.message || `An error occurred while creating Compliance Rule ${hiddenName}`
          });
        }
      }
    } catch (error) {
      console.error("Unexpected error during compliance rule creation:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  useEffect(() => {
    // Re-fetch next claim topic ID when service changes (e.g., chain switch)
    if (service) {
      getNextClaimTopicId();
    }
  }, [service, getNextClaimTopicId]);

  const handleWalletConnect = async (walletInfo) => {
    console.log('[CreateClaimTopic] Wallet connected:', walletInfo);
    setWalletModalVisible(false);
    // Retry the operation after wallet connection
    saveTopic();
  };

  const handleWalletModalClose = (connected) => {
    setWalletModalVisible(false);
    if (!connected) {
      toast.error("Wallet connection cancelled");
    }
  };

  return (
    <PageCard title="Create Compliance Rule">
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
        <p className="text-gray-600 mt-2">User-friendly name that describes the schema. Shown to end-users.</p>
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
            style={{ backgroundColor: "#f5f5f5", cursor: "default" }}
            onChange={(e) => setHiddenName(e.target.value)}
          />
        </div>
        <p className="text-gray-600 mt-2">Only alphanumeric characters allowed and no spaces. Not seen by end-users.</p>
      </div>
      <div className="flex justify-end max-[600px]:justify-center">
        <Button className="max-[600px]:w-[60%] min-w-max text-center font-semibold rounded h-11 bg-[#7F56D9] text-white" onClick={saveClaimTopic}>
          Create Compliance Rule
        </Button>
      </div>
      
      {/* Transaction Modal */}
      <TransactionModal
        visible={transactionModal.visible}
        status={transactionModal.status}
        title={transactionModal.title}
        loadingMessage={transactionModal.loadingMessage}
        successMessage={transactionModal.successMessage}
        errorMessage={transactionModal.errorMessage}
        data={transactionModal.data}
        onClose={() => setTransactionModal({ ...transactionModal, visible: false })}
        autoCloseDelay={3000}
      />
      <WalletConnectionModal
        visible={walletModalVisible}
        onClose={handleWalletModalClose}
        onConnect={handleWalletConnect}
      />
    </PageCard>
  );
}

export default CreateClaimTopic;
