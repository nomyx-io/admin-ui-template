import React, { useEffect, useContext } from "react";

import { Button, Input } from "antd";
import Transfer from "antd/es/transfer";
import { useNavigate, useParams, useLocation } from "../hooks/useNextRouter";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import { BlockchainServiceManager } from "@nomyx/shared";
import DfnsService from "../services/DfnsService";
import { isAlphanumericAndSpace, awaitTimeout } from "../utils";
import { WalletPreference } from "../utils/Constants";
import TransactionModal from "./shared/TransactionModal";
import WalletConnectionModal from "./WalletConnectionModal";
import PageCard from "./shared/PageCard";

function CreateTrustedIssuer({ service }) {
  const navigate = useNavigate();
  const [verifierName, setVerifierName] = React.useState("");
  const [walletAddress, setWalletAddress] = React.useState("");
  const [claimTopics, setClaimTopics] = React.useState([]);
  const [targetKeys, setTargetKeys] = React.useState([]);
  const [selectedKeys, setSelectedKeys] = React.useState([]);
  const location = useLocation();
  const [walletModalVisible, setWalletModalVisible] = React.useState(false);
  const [transactionModal, setTransactionModal] = React.useState({
    visible: false,
    status: 'loading',
    title: 'Creating Trusted Issuer',
    loadingMessage: 'Adding trusted issuer to blockchain...',
    successMessage: 'Trusted Issuer created successfully!',
    errorMessage: ''
  });

  // Get user and dfnsToken from RoleContext (for DFNS operations)
  const { user, dfnsToken } = useContext(RoleContext);
  
  // Get wallet state from BlockchainServiceManager
  const manager = BlockchainServiceManager.getInstance();
  const [isConnected, setIsConnected] = React.useState(false);
  const [account, setAccount] = React.useState(null);
  
  React.useEffect(() => {
    const updateWalletState = () => {
      if (manager && manager.isServiceInitialized()) {
        setIsConnected(manager.isWalletConnected());
        setAccount(manager.getWalletAddress());
      }
    };
    
    updateWalletState();
    
    // Listen for wallet events
    const handleWalletUpdate = () => updateWalletState();
    manager.on('wallet:connected', handleWalletUpdate);
    manager.on('wallet:disconnected', handleWalletUpdate);
    
    return () => {
      manager.off('wallet:connected', handleWalletUpdate);
      manager.off('wallet:disconnected', handleWalletUpdate);
    };
  }, []);
  
  const getWalletType = () => {
    const provider = manager.getWalletProvider();
    return provider ? 'private' : null;  // Simplified for now
  };

  let id = location.pathname.split("/")[2];
  useEffect(() => {
    (async function () {
      console.log("[CreateTrustedIssuer] Service:", service);
      console.log("[CreateTrustedIssuer] Service type:", typeof service);
      console.log(
        "[CreateTrustedIssuer] Service available methods:",
        service ? Object.getOwnPropertyNames(Object.getPrototypeOf(service)) : "service is null"
      );
      console.log("[CreateTrustedIssuer] isValidAddress exists?", service && typeof service.isValidAddress);
      console.log("[CreateTrustedIssuer] addTrustedIssuer exists?", service && typeof service.addTrustedIssuer);
      if (service) {
        // Try to get detailed claim topics with names first
        let result = null;

        if (service.getClaimTopicsDetailed && typeof service.getClaimTopicsDetailed === 'function') {
          console.log("[CreateTrustedIssuer] Using getClaimTopicsDetailed");
          result = await service.getClaimTopicsDetailed();
        } else if (service.getClaimTopics && typeof service.getClaimTopics === 'function') {
          console.log("[CreateTrustedIssuer] Falling back to getClaimTopics");
          result = await service.getClaimTopics();
        }

        console.log("[CreateTrustedIssuer] Claim topics result:", result);

        // Only try to load issuer data if we're editing (not creating)
        if (id && id !== "create") {
          const issuerData = await service?.getTrustedIssuersByObjectId(id);
          if (issuerData) {
            setVerifierName(issuerData.attributes?.verifierName || "");
            setWalletAddress(issuerData.attributes?.issuer || "");

            // Set targetKeys from issuerData claim topics
            const issuerClaimTopics = issuerData.attributes?.claimTopics || [];
            const selectedTopicIds = issuerClaimTopics.map((ct) => ct.topic);
            setTargetKeys(selectedTopicIds);
          }
        }

        let data = [];

        if (result) {
          // Handle different formats
          if (Array.isArray(result) && result.length > 0) {
            if (typeof result[0] === "number") {
              // Basic format: array of numbers (no names available)
              result.forEach((topicId) => {
                data.push({
                  key: topicId,
                  displayName: `Topic ${topicId}`,
                  id: topicId.toString(),
                  topic: topicId,
                });
              });
            } else if (result[0].name !== undefined || result[0].displayName !== undefined) {
              // Detailed format from getClaimTopicsDetailed
              result.forEach((item) => {
                const displayName = item.displayName || item.name || `Topic ${item.id}`;
                data.push({
                  key: item.id,
                  displayName: displayName,
                  id: item.id.toString(),
                  topic: item.id,
                });
              });
            } else if (result[0].attributes) {
              // Parse format: array of objects with attributes
              result.forEach((item) => {
                data.push({
                  key: item.attributes?.topic || item.attributes?.topicId,
                  displayName: item.attributes?.displayName || `Topic ${item.attributes?.topic || item.attributes?.topicId}`,
                  id: item.id,
                  topic: item.attributes?.topic || item.attributes?.topicId,
                });
              });
            } else {
              // Unknown format, try to handle gracefully
              result.forEach((item, index) => {
                const topicId = item.topic || item.topicId || item.id || index;
                const displayName = item.displayName || item.name || `Topic ${topicId}`;
                data.push({
                  key: topicId,
                  displayName: displayName,
                  id: topicId.toString(),
                  topic: topicId,
                });
              });
            }
          }
          setClaimTopics(data);
        }
      }
    })();
  }, [service, id]);

  // Reset form validation when service changes (chain switching)
  useEffect(() => {
    // Clear any validation errors when the service changes
    // This ensures address validation uses the correct blockchain format
    if (service && walletAddress) {
      // Re-validate the address with the new service
      const isValid = service.isValidAddress(walletAddress);
      console.log(`[CreateTrustedIssuer] Re-validating address ${walletAddress} with new service: ${isValid}`);
    }
  }, [service]);

  const onChange = (nextTargetKeys, direction, moveKeys) => {
    setTargetKeys(nextTargetKeys);
  };
  const onSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
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

    if (!service || typeof service.isValidAddress !== "function") {
      console.error("[CreateTrustedIssuer] isValidAddress method not available on service");
      toast.error("Address validation service not available");
      return false;
    }

    if (!service.isValidAddress(walletAddress)) {
      toast.error("Invalid Wallet Address in Trusted Issuer Wallet Address");
      return false;
    }

    if (targetKeys.length < 1) {
      toast.error("Assign Atleast 1 Compliance Rule");
      return false;
    }

    return true;
  }

  const saveTrustedIssuer = async () => {
    // Get wallet type from BlockchainSelectionManager (wallet-agnostic)
    const walletType = getWalletType();
    console.log("[CreateTrustedIssuer] saveTrustedIssuer called");
    console.log("[CreateTrustedIssuer] walletType:", walletType);
    console.log("[CreateTrustedIssuer] isConnected:", isConnected);
    console.log("[CreateTrustedIssuer] service available:", !!service);
    console.log("[CreateTrustedIssuer] service.addTrustedIssuer available:", !!(service && service.addTrustedIssuer));

    const trimmedVerifierName = verifierName.trim();

    if (!validateTrustedIssuer(trimmedVerifierName, walletAddress, targetKeys)) {
      return;
    }
    
    // For local development, we can proceed without wallet connection
    const isLocalDev = typeof window !== 'undefined' && 
                       (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1');
    
    // Check if wallet is connected (skip for local dev)
    if (!isLocalDev && !isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      // For local development or when service.addTrustedIssuer is available
      if (isLocalDev && service && service.addTrustedIssuer) {
        console.log("[CreateTrustedIssuer] Using local development mode");
        
        // Show transaction modal
        setTransactionModal({
          visible: true,
          status: 'loading',
          title: 'Creating Trusted Issuer',
          loadingMessage: 'Adding trusted issuer to blockchain...',
          successMessage: '',
          errorMessage: ''
        });

        try {
          const result = await service.addTrustedIssuer(
            walletAddress,
            targetKeys,
            trimmedVerifierName
          );
          
          console.log(`[CreateTrustedIssuer] Add trusted issuer result:`, result);
          
          // Check if wallet connection is required
          if (result && result.requiresWallet) {
            console.log('[CreateTrustedIssuer] Wallet connection required');
            setTransactionModal({ visible: false });
            setWalletModalVisible(true);
            return;
          }
          
          if (!result || (!result.success && !result.txHash && !result.transactionHash)) {
            throw new Error('Transaction did not return a success confirmation');
          }
          
          // Update modal
          setTransactionModal(prev => ({
            ...prev,
            loadingMessage: 'Finalizing trusted issuer registration...'
          }));
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Show success
          setTransactionModal({
            visible: true,
            status: 'success',
            title: 'Success',
            loadingMessage: '',
            successMessage: `Successfully Added Trusted Issuer`,
            errorMessage: '',
            data: {
              'Wallet Address': walletAddress,
              'Display Name': trimmedVerifierName,
              'Claim Topics': targetKeys.join(', ')
            }
          });
          
          // Navigate after a short delay
          setTimeout(() => {
            navigate("/issuers");
          }, 2000);
          
        } catch (error) {
          console.error("Error adding Trusted Issuer:", error);
          setTransactionModal({
            visible: true,
            status: 'error',
            title: 'Error',
            loadingMessage: '',
            successMessage: '',
            errorMessage: error.message || `An error occurred while adding Trusted Issuer ${walletAddress}`
          });
        }
      }
      // Check if we're using DFNS managed wallet
      else if (walletType === 'managed' && (!service || !service.addTrustedIssuer)) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Initiate adding the trusted issuer
              const { initiateResponse, error: initError } = await DfnsService.initiateAddTrustedIssuer(
                walletAddress,
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
              // Note: Update is not needed immediately after creation
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
          )
          .catch((error) => {
            console.error("Error after attempting to add Trusted Issuer:", error);
          });
      } else if (walletType === 'private' && service && service.addTrustedIssuer) {
        // Handle private wallet (DEV, MetaMask, Freighter)
        console.log("[CreateTrustedIssuer] Using private wallet mode");
        console.log("[CreateTrustedIssuer] Service available, proceeding with blockchain call");
        
        // Show transaction modal
        setTransactionModal({
          visible: true,
          status: 'loading',
          title: 'Creating Trusted Issuer',
          loadingMessage: 'Adding trusted issuer to blockchain...',
          successMessage: '',
          errorMessage: ''
        });

        try {
          if (!service || typeof service.addTrustedIssuer !== "function") {
            throw new Error("addTrustedIssuer method not available on service");
          }
          
          const result = await service.addTrustedIssuer(
            walletAddress,
            targetKeys,
            trimmedVerifierName
          );
          
          // Verify the transaction was successful
          console.log(`[CreateTrustedIssuer] Add trusted issuer result:`, result);
          if (!result || (!result.success && !result.txHash && !result.transactionHash)) {
            throw new Error('Transaction did not return a success confirmation');
          }
          
          // Update modal
          setTransactionModal(prev => ({
            ...prev,
            loadingMessage: 'Finalizing trusted issuer registration...'
          }));
          
          // Add a small delay to ensure blockchain state is updated
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Show success
          setTransactionModal({
            visible: true,
            status: 'success',
            title: 'Success',
            loadingMessage: '',
            successMessage: `Successfully Added Trusted Issuer ${walletAddress}`,
            errorMessage: '',
            data: {
              'Wallet Address': walletAddress,
              'Verifier Name': trimmedVerifierName,
              'Claim Topics': targetKeys.join(', ')
            }
          });
          
          // Navigate after a short delay
          setTimeout(() => {
            navigate("/issuers");
          }, 2000);
          
        } catch (error) {
          console.error("Error adding Trusted Issuer:", error);
          setTransactionModal({
            visible: true,
            status: 'error',
            title: 'Error',
            loadingMessage: '',
            successMessage: '',
            errorMessage: error.message || `An error occurred while adding Trusted Issuer ${walletAddress}`
          });
        }
      } else {
        // This should not happen with the wallet-agnostic approach
        console.error("[CreateTrustedIssuer] Unable to determine how to proceed. WalletType:", walletType, "Service:", !!service);
        toast.error("Unable to process request. Please ensure wallet is connected.");
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
      if (walletPreference === WalletPreference.MANAGED) {
        // Handle MANAGED wallet preference using DFNSService
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        toast
          .promise(
            (async () => {
              // Initiate updating the trusted issuer
              const { initiateResponse, error: initError } = await DfnsService.initiateUpdateTrustedIssuer(
                walletAddress,
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
              success: `Successfully Updated Trusted Issuer ${walletAddress}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while updating Trusted Issuer ${walletAddress}`}</div>;
                },
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to update Trusted Issuer:", error);
          });
      } else if (walletPreference === WalletPreference.PRIVATE || walletPreference === undefined || walletPreference === null) {
        // Handle PRIVATE wallet preference (or undefined/null as default)
        console.log("[CreateTrustedIssuer] Using PRIVATE wallet mode (or default)");
        toast
          .promise(
            (async () => {
              const keysWithTimestamps = targetKeys.map((topic) => ({
                topic,
                timestamp: Date.now(),
              }));
              await service.updateIssuerClaimTopics(walletAddress, targetKeys);
              await service.updateTrustedIssuer({
                verifierName: trimmedVerifierName,
                issuer: walletAddress,
                claimTopics: keysWithTimestamps,
              });
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
            console.error("Error after attempting to update Trusted Issuer:", error);
          });
      }
    } catch (error) {
      console.error("Unexpected error during updateTrustedIssuer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const handleWalletConnect = async (walletInfo) => {
    console.log('[CreateTrustedIssuer] Wallet connected:', walletInfo);
    setWalletModalVisible(false);
    // Retry the operation after wallet connection
    saveTrustedIssuer();
  };

  const handleWalletModalClose = (connected) => {
    setWalletModalVisible(false);
    if (!connected) {
      toast.error("Wallet connection cancelled");
    }
  };

  return (
    <PageCard title={id === "create" ? "Create Trusted Issuer" : "Update Trusted Issuer"}>
      <div>
        <div>
          <label htmlFor="trustedIssuerName">Trusted Issuer display name *</label>
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
              onChange={(e) => (id === "create" ? setWalletAddress(e.target.value.trim()) : "")}
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
        <div className="flex justify-end max-[600px]:justify-center mt-6">
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

export default CreateTrustedIssuer;
