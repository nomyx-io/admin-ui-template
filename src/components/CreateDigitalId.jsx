import { useState, useContext, useEffect } from "react";

import { Button, Input } from "antd";
import { useNavigate, useParams, useLocation } from "../hooks/useNextRouter";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext"; // Import RoleContext for user/dfnsToken
import { BlockchainServiceManager } from "@nomyx/shared";
import DfnsService from "../services/DfnsService";
import { awaitTimeout } from "../utils";
import { WalletPreference } from "../utils/Constants";
import TransactionModal from "./shared/TransactionModal";
import PageCard from "./shared/PageCard";

function CreateDigitalId({ service }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navigate = useNavigate();

  // Get user and dfnsToken from RoleContext (for DFNS operations)
  const { user, dfnsToken } = useContext(RoleContext);
  
  // Get wallet state from BlockchainServiceManager
  const manager = BlockchainServiceManager.getInstance();
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  
  useEffect(() => {
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

  const [displayName, setDisplayName] = useState(searchParams.get("displayName") || "");
  const [walletAddress, setWalletAddress] = useState(searchParams.get("walletAddress") || "");
  const [accountNumber, setAccountNumber] = useState(searchParams.get("accountNumber") || "");
  const [transactionModal, setTransactionModal] = useState({
    visible: false,
    status: 'loading',
    title: 'Creating Digital Identity',
    loadingMessage: 'Creating identity on blockchain...',
    successMessage: 'Digital Identity created successfully!',
    errorMessage: ''
  });

  // Reset form validation when service changes (chain switching)
  useEffect(() => {
    // Clear any validation errors when the service changes
    // This ensures address validation uses the correct blockchain format
    if (service && walletAddress) {
      // Re-validate the address with the new service
      const isValid = service.isValidAddress(walletAddress);
      console.log(`[CreateDigitalId] Re-validating address ${walletAddress} with new service: ${isValid}`);
    }
  }, [service]);

  function validateDigitalID(displayName, walletAddress, accountNumber, service) {
    if (displayName.trim() === "") {
      toast.error("Identity display Name is required");
      return false;
    }

    //if (!isAlphanumericAndSpace(displayName)) {
    //    toast.error('Identity display Name must contain only alphanumeric characters');
    //    return false;
    //}

    if (walletAddress?.trim() === "") {
      toast.error("Investor Wallet Address is required");
      return false;
    }

    if (!service.isValidAddress(walletAddress)) {
      toast.error("Invalid Wallet Address in Investor Wallet Address");
      return false;
    }

    if (accountNumber?.trim() === "") {
      toast.error("Investor KYC ID is required");
      return false;
    }

    //if (!isAlphanumericAndSpace(accountNumber)) {
    //    toast.error('Investor KYC ID must contain only alphanumeric characters');
    //    return false;
    //}

    return true;
  }

  const handleCreateDigitalId = async () => {
    // Get wallet type from BlockchainSelectionManager (wallet-agnostic)
    const walletType = getWalletType();
    console.log("[CreateDigitalId] handleCreateDigitalId called");
    console.log("[CreateDigitalId] walletType:", walletType);
    console.log("[CreateDigitalId] isConnected:", isConnected);
    console.log("[CreateDigitalId] service available:", !!service);
    console.log("[CreateDigitalId] service.createIdentity available:", !!(service && service.createIdentity));

    const trimmedDisplayName = displayName.trim();
    const trimmedAccountNumber = accountNumber.trim();
    // Use form input if provided, otherwise use connected account address
    const addressToValidate = walletAddress || account;

    if (!validateDigitalID(trimmedDisplayName, addressToValidate, trimmedAccountNumber, service)) {
      return; // Early return if validation fails
    }
    
    // For local development, we can proceed without wallet connection
    const isLocalDev = typeof window !== 'undefined' && 
                       (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1');
    
    // Let the WalletProtectedService handle wallet connection requirements
    // The service will show a modal if wallet is not connected
    // if (!isConnected) {
    //   toast.warning("You must first connect to an account");
    //   // Try to trigger wallet connection through the manager
    //   // The BlockchainSelectionManager UI will handle showing the modal
    //   try {
    //     await manager.connectWallet();
    //   } catch (error) {
    //     console.log("[CreateDigitalId] Wallet connection cancelled or failed:", error);
    //   }
    //   return;
    // }

    try {
      // Always use the service, which will handle wallet protection
      if (service && service.createIdentity) {
        console.log("[CreateDigitalId] Calling service.createIdentity");
        // Use form input if provided, otherwise use connected account address
        const addressToUse = walletAddress || account;
        console.log("[CreateDigitalId] Using address:", addressToUse);
        
        // Show transaction modal
        setTransactionModal({
          visible: true,
          status: 'loading',
          title: 'Creating Digital Identity',
          loadingMessage: 'Creating identity on blockchain...',
          successMessage: '',
          errorMessage: ''
        });

        try {
          // For Stellar, createIdentity already adds it to the registry
          const createResult = await service.createIdentity(addressToUse);
          console.log(`[CreateDigitalId] Create identity result:`, createResult);
          
          if (!createResult || (!createResult.identityAddress && !createResult.txHash)) {
            throw new Error('Failed to create identity');
          }
          
          // Check if this is an existing identity (not newly created)
          // identityAddress could be a string, an object, or an array
          let identityAddress = createResult.identityAddress;

          // If it's an object (like the Stellar identity details), extract the owner address
          if (identityAddress && typeof identityAddress === 'object' && !Array.isArray(identityAddress)) {
            identityAddress = identityAddress.owner || identityAddress.address || JSON.stringify(identityAddress);
          } else if (Array.isArray(identityAddress)) {
            identityAddress = identityAddress[0];
          }

          // Check if this indicates an existing identity (txHash starts with 'existing_identity_')
          const isExisting = createResult.txHash && typeof createResult.txHash === 'string' &&
                           createResult.txHash.startsWith('existing_identity_');

          if (isExisting) {
            console.log(`[CreateDigitalId] Using existing identity for wallet: ${addressToUse}`);
          } else {
            console.log(`[CreateDigitalId] Successfully created new identity: ${identityAddress || addressToUse}`);
          }
          
          // Update modal to show adding to registry
          setTransactionModal(prev => ({
            ...prev,
            loadingMessage: 'Registering identity on-chain...'
          }));
          
          // Wait longer to ensure the identity is fully registered on-chain
          // This is important for Stellar where transactions may take time to finalize
          console.log(`[CreateDigitalId] Waiting for on-chain finalization...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // CRITICAL: Save to Parse database AFTER blockchain success
          // This ensures blockchain is the source of truth
          setTransactionModal(prev => ({
            ...prev,
            loadingMessage: 'Saving identity details to database...'
          }));
          
          try {
            console.log("[CreateDigitalId] Saving identity to Parse database (after blockchain success)");
            
            // Get the chain ID directly from BlockchainServiceManager
            // This returns the chain key (e.g., "stellar-local") that we need
            const chainId = manager.getCurrentChainId() || 'unknown';
            
            console.log("[CreateDigitalId] Using chain ID for Parse:", chainId);
            
            // For Stellar addresses, keep them uppercase; for Ethereum, use lowercase
            const normalizedAddress = (addressToUse.length === 56 && addressToUse[0] === 'G') 
              ? addressToUse.toUpperCase()  // Stellar address
              : addressToUse.toLowerCase();  // Ethereum address
            
            // Use Parse Cloud function to create/update the identity record
            // This is now a backup/cache after blockchain success
            const Parse = window.Parse;
            if (Parse) {
              const result = await Parse.Cloud.run('createIdentity', {
                walletAddress: normalizedAddress,
                displayName: trimmedDisplayName,
                accountNumber: trimmedAccountNumber,
                chain: chainId,
                metaData: {
                  identityAddress: identityAddress,
                  createdOnBlockchain: true,
                  blockchainTxHash: createResult.txHash || 'pending'
                }
              });
              console.log("[CreateDigitalId] Identity saved to Parse successfully:", result);
            } else {
              console.warn("[CreateDigitalId] Parse not available, skipping database save");
            }
          } catch (parseError) {
            // Parse save failed, but blockchain succeeded - log but don't fail the whole operation
            console.error("[CreateDigitalId] Failed to save identity to Parse (blockchain succeeded):", parseError);
            // Continue - blockchain is the source of truth
          }
          
          // Note: Wallet identity status will be refreshed on next interaction
          console.log(`[CreateDigitalId] Identity created successfully`);
          
          // Show success
          setTransactionModal({
            visible: true,
            status: 'success',
            title: 'Success',
            loadingMessage: '',
            successMessage: 'Digital Identity created successfully!',
            errorMessage: '',
            data: {
              'Wallet Address': addressToUse,
              'Display Name': trimmedDisplayName,
              'KYC ID': trimmedAccountNumber,
              ...(createResult.txHash && !createResult.txHash.startsWith('existing_identity_') ? {'Transaction Hash': createResult.txHash} : {})
            }
          });
          
          // Navigate after a short delay
          setTimeout(() => {
            console.log(`[CreateDigitalId] Navigating to identities page`);
            navigate("/identities");
          }, 2000);
          
        } catch (error) {
          console.error("Error creating Digital Identity:", error);
          setTransactionModal({
            visible: true,
            status: 'error',
            title: 'Error',
            loadingMessage: '',
            successMessage: '',
            errorMessage: error.message || `Failed to create Digital Identity for ${addressToUse}`
          });
        }
      }
      // Check if we're using DFNS managed wallet
      else if (walletType === 'managed' && (!service || !service.createIdentity)) {
        // Handle MANAGED wallet preference using DFNSService
        toast
          .promise(
            (async () => {
              // Step 1: Initiate creating identity
              const { initiateResponse, error: initError } = await DfnsService.initiateCreateIdentity(walletAddress, user.walletId, dfnsToken);
              if (initError) throw new Error(initError);

              // Step 2: Complete creating identity
              const { completeResponse, error: completeError } = await DfnsService.completeCreateIdentity(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge, // Assuming challenge is part of the initiateResponse
                initiateResponse.requestBody
              );
              if (completeError) throw new Error(completeError);
              // Step 3: Get identity details
              const identity = await DfnsService.getIdentity(walletAddress);

              // Step 4: Initiate add identity
              const { addIdentityInitResponse, error: addIdentityInitError } = await DfnsService.initiateAddIdentity(
                walletAddress,
                identity,
                user.walletId,
                dfnsToken
              );
              if (addIdentityInitError) throw new Error(addIdentityInitError);

              // Step 5: Complete add identity
              const { addIdentityCompleteResponse, error: addIdentityCompleteError } = await DfnsService.completeAddIdentity(
                user.walletId,
                dfnsToken,
                addIdentityInitResponse.challenge,
                addIdentityInitResponse.requestBody
              );
              if (addIdentityCompleteError) throw new Error(addIdentityCompleteError);

              // Step 6: Update identity
              const currentChain = await service.getCurrentChain();
              await service.updateIdentity(walletAddress.toLocaleLowerCase(), {
                displayName: trimmedDisplayName,
                walletAddress: walletAddress.toLocaleLowerCase(),
                accountNumber: trimmedAccountNumber,
                status: "active",
                address: { identityAddress: identity.identityAddress || identity }, // Send address as object
                chain: currentChain, // Add the current chain for consistency with PRIVATE flow
              });

              // Step 7: Approve user if needed
              if (searchParams.has("walletAddress")) {
                const userExists = await service.isUser(walletAddress.toLocaleLowerCase()); // Check if the user exists
                if (userExists) {
                  await toast.promise(
                    service.approveUser(walletAddress.toLocaleLowerCase()), // Directly pass the promise without awaiting it here
                    {
                      pending: "Approving user...",
                      success: "User approved successfully",
                      error: {
                        render: ({ data }) => <div>{data?.reason || "An error occurred while approving user"}</div>,
                      },
                    }
                  );
                } else {
                  // Handle the case where the user doesn't exist
                  toast.error(`User with wallet address ${walletAddress} does not exist.`);
                }
              }
              navigate("/identities");

              //return completeResponse;
            })(),
            {
              pending: "Creating Digital Identity...",
              success: "Digital Identity created successfully",
              error: {
                render: ({ data }) => <div>{data?.reason || "An error occurred while creating Digital Identity"}</div>,
              },
            }
          )
          .catch((error) => {
            console.error("Error after attempting to create Digital ID:", error);
          });
      } else if (walletType === 'private' && service && service.createIdentity) {
        // Handle private wallet (DEV, MetaMask, Freighter)
        console.log("[CreateDigitalId] Using private wallet mode");
        console.log("[CreateDigitalId] Service available, proceeding with blockchain call");
        
        // Show transaction modal
        setTransactionModal({
          visible: true,
          status: 'loading',
          title: 'Creating Digital Identity',
          loadingMessage: 'Creating identity on blockchain...',
          successMessage: '',
          errorMessage: ''
        });

        try {
          // Step 1: Create identity
          console.log("[CreateDigitalId] Creating identity for:", walletAddress);
          const createResult = await service.createIdentity(walletAddress);
          console.log("[CreateDigitalId] Create identity result:", createResult);
          
          // Verify the transaction was successful
          if (!createResult || (!createResult.identityAddress && !createResult.txHash)) {
            throw new Error('Identity creation did not return expected result');
          }

          // Update modal
          setTransactionModal(prev => ({
            ...prev,
            loadingMessage: 'Getting identity details...'
          }));

          // Step 2: Get identity details
          console.log("[CreateDigitalId] Getting identity details");
          const identity = await service.getIdentity(walletAddress);
          console.log("[CreateDigitalId] Got identity:", identity);
          
          // Update modal
          setTransactionModal(prev => ({
            ...prev,
            loadingMessage: 'Adding identity to registry...'
          }));
          
          // Step 3: Add identity
          console.log("[CreateDigitalId] Adding identity to registry");
          const addResult = await service.addIdentity(walletAddress, identity);
          console.log("[CreateDigitalId] Add identity result:", addResult);
          
          // Add a small delay to ensure blockchain state is updated
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Step 4: CRITICAL - Update identity in Parse so it appears in the table
          setTransactionModal(prev => ({
            ...prev,
            loadingMessage: 'Saving identity details...'
          }));
          
          try {
            console.log("[CreateDigitalId] Updating identity in Parse");
            const currentChain = await service.getCurrentChain();
            await service.updateIdentity(walletAddress.toLocaleLowerCase(), {
              displayName: trimmedDisplayName,
              walletAddress: walletAddress.toLocaleLowerCase(),
              accountNumber: trimmedAccountNumber,
              status: "active",
              address: { identityAddress: identity.identityAddress }, // Send address as object
              chain: currentChain, // Add the current chain to segregate identities
            });
            console.log("[CreateDigitalId] Identity saved to Parse successfully");
          } catch (parseError) {
            // This is now critical - if Parse update fails, the identity won't show in the table
            console.error("[CreateDigitalId] Failed to save identity to Parse:", parseError);
            throw new Error(`Identity created on blockchain but failed to save details: ${parseError.message}`);
          }

          // Step 5: Approve user if needed (optional)
          if (searchParams.has("walletAddress")) {
            try {
              const userExists = await service.isUser(walletAddress.toLocaleLowerCase());
              if (userExists) {
                await service.approveUser(walletAddress.toLocaleLowerCase());
              }
            } catch (error) {
              console.log("[CreateDigitalId] User approval failed (non-critical):", error.message);
            }
          }
          
          // Note: Wallet identity status will be refreshed on next interaction
          console.log("[CreateDigitalId] Identity created successfully");
          
          // Show success
          setTransactionModal({
            visible: true,
            status: 'success',
            title: 'Success',
            loadingMessage: '',
            successMessage: 'Digital Identity created successfully!',
            errorMessage: '',
            data: {
              'Wallet Address': walletAddress,
              'Display Name': trimmedDisplayName,
              'KYC ID': trimmedAccountNumber,
              ...(createResult.txHash && !createResult.txHash.startsWith('existing_identity_') ? {'Transaction Hash': createResult.txHash} : {})
            }
          });
          
          // Navigate after a short delay
          setTimeout(() => {
            console.log("[CreateDigitalId] Navigation to /identities");
            navigate("/identities");
          }, 2000);
          
        } catch (error) {
          console.error("[CreateDigitalId] Error creating Digital Identity:", error);
          setTransactionModal({
            visible: true,
            status: 'error',
            title: 'Error',
            loadingMessage: '',
            successMessage: '',
            errorMessage: error.message || "An error occurred while creating Digital Identity"
          });
        }
      } else {
        // This should not happen with the wallet-agnostic approach
        console.error("[CreateDigitalId] Unable to determine how to proceed. WalletType:", walletType, "Service:", !!service);
        toast.error("Unable to process request. Please ensure wallet is connected.");
      }
    } catch (error) {
      toast.error("Error: " + error.message || error);
    }
  };

  return (
    <PageCard title="Create Digital Identity">
      <div>
        <div>
          <label htmlFor="identityName">Identity display name *</label>
          <div className="mt-3 relative w-full flex border rounded-lg">
            <Input
              id="identityName"
              value={displayName}
              className="border w-full p-2 rounded-lg text-xl"
              placeholder="Enter Display Name"
              type="text"
              maxLength={32}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="absolute right-5 top-3">{displayName.length}/32</p>
          </div>
          <p>User-friendly name that describes the trusted issuers.Shown to end-users</p>
        </div>
        <div className="mt-10 mb-6 w-[100%] max-[600px]:w-full border p-6 rounded-lg">
          <div>
            <label htmlFor="investorWalletAddress">Investor Wallet Address</label>
            <div className="mt-2 relative w-full flex border rounded-lg">
              <Input
                id="walletAddress"
                value={walletAddress}
                className="border w-full p-2 rounded-lg text-3xl"
                placeholder="Enter Wallet Address"
                type="text"
                onChange={(e) => setWalletAddress(e.target.value.trim())}
              />
            </div>
          </div>
          <div className="mt-6">
            <label htmlFor="investorAccountNumber">Investor KYC ID Provider Account Number</label>
            <div className="mt-2 relative w-full flex border rounded-lg">
              <Input
                id="investorAccountNumber"
                value={accountNumber}
                className="border w-full p-2 rounded-lg text-3xl"
                placeholder="Enter Account number"
                type="text"
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end max-[600px]:justify-center">
          <Button onClick={handleCreateDigitalId} className="nomyx-id-button max-[600px]:w-[60%] min-w-max text-center font-semibold h-11">
            Create Digital Id
          </Button>
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
    </PageCard>
  );
}

export default CreateDigitalId;
