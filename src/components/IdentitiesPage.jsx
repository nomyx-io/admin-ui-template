import { useState, useEffect, useCallback, useContext } from "react";

import { Tabs } from "antd";
import { useNavigate } from "../hooks/useNextRouter";
import { toast } from "react-toastify";

import ObjectList from "./ObjectList";
import TransactionModal from "./shared/TransactionModal";
import { RoleContext } from "../context/RoleContext"; // Import RoleContext for user/dfnsToken only
import DfnsService from "../services/DfnsService";
import { NomyxAction } from "../utils/Constants";
import { WalletPreference } from "../utils/Constants";
import { BlockchainServiceManager, getClaimTopicHelper } from "@nomyx/shared";

const IdentitiesPage = ({ service }) => {
  const navigate = useNavigate();
  const [identities, setIdentities] = useState(undefined); // undefined = loading
  const [pendingIdentities, setPendingIdentities] = useState(undefined); // undefined = loading
  const [activeTab, setActiveTab] = useState("Identities");
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [currentChain, setCurrentChain] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [abortController, setAbortController] = useState(null);
  // Get user and dfnsToken from RoleContext (for DFNS operations)
  const { user, dfnsToken } = useContext(RoleContext);
  
  // Get wallet state from BlockchainServiceManager
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [transactionModal, setTransactionModal] = useState({
    visible: false,
    status: 'loading',
    title: '',
    loadingMessage: '',
    successMessage: '',
    errorMessage: '',
    data: null
  });
  
  useEffect(() => {
    const manager = BlockchainServiceManager.getInstance();
    const checkWallet = () => {
      const connected = manager.isWalletConnected();
      const address = manager.getWalletAddress();
      
      if (!connected) {
        console.log('[IdentitiesPage] Wallet check:', { connected, address });    
      }
      
      setIsConnected(connected);
      setAccount(address);
    };
    
    var intervalChecker = null;
    // Always do initial check
    checkWallet();

    // Set up periodic check as a fallback (every 2 seconds) if not connected
    if (!manager.isWalletConnected()) {
      intervalChecker = setInterval(checkWallet, 2000);
    }
    
    const handleWalletConnected = () => checkWallet();
    const handleWalletDisconnected = () => checkWallet();
    
    manager.on('wallet:connected', handleWalletConnected);
    manager.on('wallet:disconnected', handleWalletDisconnected);
    
    return () => {
      if (intervalChecker != null) {
        clearInterval(intervalChecker);
      }
      manager.off('wallet:connected', handleWalletConnected);
      manager.off('wallet:disconnected', handleWalletDisconnected);
    };
  }, []);
  
  const getWalletType = () => {
    // Get wallet type from manager if needed
    const manager = BlockchainServiceManager.getInstance();
    const walletInfo = manager.getWalletInfo();
    const walletType = walletInfo?.walletType || 'unknown';
    
    // Treat dev wallets as private (non-custodial) wallets
    if (walletType === 'dev' || walletType === 'dev2') {
      return 'private';
    }
    
    return walletType;
  };

  const fetchData = useCallback(
    async (tab) => {
      // Cancel any previous fetch
      if (abortController) {
        abortController.abort();
      }
      
      // Create new abort controller for this fetch
      const controller = new AbortController();
      setAbortController(controller);
      
      setIsLoading(true);
      try {
        // Wait a bit if service is still initializing
        let retryCount = 0;
        while (!service && retryCount < 10) {
          console.log('[IdentitiesPage] Service not available, waiting...');
          await new Promise(resolve => setTimeout(resolve, 100));
          retryCount++;
        }
        
        if (!service) {
          console.error('[IdentitiesPage] Service not available after waiting');
          return;
        }
        
        let fetchedIdentities = [];
        if (service && !controller.signal.aborted) {
          // Get current chain
          const chain = await service.getCurrentChain();
          setCurrentChain(chain);
          
          // Extract chain ID for filtering
          const chainId = chain?.id || chain?.chainId || chain?.networkId || null;

          if (tab === "Identities" || tab === "Claims") {
            // Fetch active identities for Identities and Claims tabs, filtered by chain
            fetchedIdentities = await service.getActiveIdentities(chainId);

            // Get claim topic helper for name mapping
            const claimHelper = getClaimTopicHelper();

            // Use Promise.all to map claims to names asynchronously
            fetchedIdentities = await Promise.all(fetchedIdentities.map(async (identity) => {
              let identidyObj = {};
              // Check if identity has attributes (blockchain format) or direct fields (Parse format)
              const data = identity.attributes || identity;

              if (identity && data) {
                // Map active identities fields
                const claimsArray = data.claims || [];
                // Convert claim IDs to display names
                const claimNames = await claimHelper.getClaimTopicNames(claimsArray);
                identidyObj.claims = claimNames.join(", ");
                // Ensure displayName is a string, not an object
                const rawDisplayName = data.displayName || "";
                identidyObj.displayName = typeof rawDisplayName === 'string' ? rawDisplayName : String(rawDisplayName);
                identidyObj.kyc_id = data.accountNumber || "";
                // Handle both string and object address formats for backward compatibility
                const address = data.address || data.identityAddress || data.walletAddress;
                let displayAddress = "";
                if (typeof address === "string") {
                  displayAddress = address;
                } else if (address && typeof address === "object") {
                  displayAddress = address.identityAddress || "";
                } else {
                  // Fallback to walletAddress if no address field
                  displayAddress = data.walletAddress || "";
                }
                
                // For Stellar addresses, ensure they are displayed in uppercase
                if (displayAddress.length === 56 && displayAddress[0] && displayAddress[0].toLowerCase() === 'g') {
                  displayAddress = displayAddress.toUpperCase();
                }
                
                identidyObj.identityAddress = displayAddress;
                // Store walletAddress separately for deletion operations
                identidyObj.walletAddress = data.walletAddress || "";
                identidyObj.id = identity.id || identity.objectId || "";
                identidyObj.pepMatched = data.pepMatched || false;
                identidyObj.watchlistMatched = data.watchlistMatched || false;
              } else {
                // Default empty values if attributes are missing
                identidyObj.claims = "";
                identidyObj.displayName = "";
                identidyObj.kyc_id = "";
                identidyObj.identityAddress = "";
                identidyObj.id = "";
                identidyObj.pepMatched = false;
                identidyObj.watchlistMatched = false;
              }
              return identidyObj;
            }));

            if (tab === "Claims") {
              fetchedIdentities = fetchedIdentities.filter((identity) => !identity.claims || identity.claims.length === 0);
            }
          } else if (tab === "Pending") {
            // Fetch active identities and filter for those without claims
            // This shows identities that need claim topics to be assigned (unverified)
            fetchedIdentities = await service.getActiveIdentities(chainId);

            // Get claim topic helper for name mapping
            const claimHelper = getClaimTopicHelper();

            // Use Promise.all to map claims to names asynchronously
            fetchedIdentities = await Promise.all(fetchedIdentities.map(async (identity) => {
              let identidyObj = {};
              // Check if identity has attributes (blockchain format) or direct fields (Parse format)
              const data = identity.attributes || identity;

              if (identity && data) {
                // Map active identities fields
                const claimsArray = data.claims || [];
                // Convert claim IDs to display names
                const claimNames = await claimHelper.getClaimTopicNames(claimsArray);
                identidyObj.claims = claimNames.join(", ");
                // Ensure displayName is a string, not an object
                const rawDisplayName = data.displayName || "";
                identidyObj.displayName = typeof rawDisplayName === 'string' ? rawDisplayName : String(rawDisplayName);
                identidyObj.kyc_id = data.accountNumber || "";
                // Handle both string and object address formats for backward compatibility
                const address = data.address || data.identityAddress || data.walletAddress;
                let displayAddress = "";
                if (typeof address === "string") {
                  displayAddress = address;
                } else if (address && typeof address === "object") {
                  displayAddress = address.identityAddress || "";
                } else {
                  displayAddress = "";
                }
                identidyObj.identityAddress = displayAddress;
                
                // Ensure id is properly set from various possible sources
                identidyObj.id = identity.id || data.id || data.objectId || displayAddress || "";
                identidyObj.pepMatched = data.pepMatched === true || data.pepMatched === "true";
                identidyObj.watchlistMatched = data.watchlistMatched === true || data.watchlistMatched === "true";
                
                // Include the original data for debugging
                identidyObj._originalData = identity;
                
                // Include raw claims for filtering
                identidyObj._rawClaims = claimsArray;
              } else {
                // Default empty values if attributes are missing
                identidyObj.claims = "";
                identidyObj.displayName = "";
                identidyObj.kyc_id = "";
                identidyObj.identityAddress = "";
                identidyObj.id = "";
                identidyObj.pepMatched = false;
                identidyObj.watchlistMatched = false;
                identidyObj._rawClaims = [];
              }
              return identidyObj;
            }));
            
            // Filter to only show identities without claims (pending verification)
            fetchedIdentities = fetchedIdentities.filter((identity) => 
              !identity._rawClaims || identity._rawClaims.length === 0
            );
          }
        } else {
          console.error("Service object is not available");
        }

        // Set the state for identities or pending identities
        if (tab === "Identities" || tab === "Claims") {
          setIdentities(fetchedIdentities);
        } else if (tab === "Pending") {
          setPendingIdentities(fetchedIdentities);
        }
      } catch (error) {
        // Don't log errors for aborted requests
        if (error.name !== 'AbortError') {
          console.error("Error fetching data:", error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [service, abortController]
  );

  useEffect(() => {
    // Don't fetch if service is not available
    if (!service) {
      console.log('[IdentitiesPage] Service not available yet, skipping fetch');
      return;
    }
    
    fetchData(activeTab);
    
    // Cleanup function to abort fetch on unmount or deps change
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [activeTab, service, refreshTrigger]); // Removed fetchData from deps to prevent infinite loop

  // Chain monitoring is already handled by the service/hook layer
  // Removed duplicate monitoring to prevent redundant API calls

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleRemoveUser = async (record) => {
    const { displayName, identityAddress } = record;
    toast
      .promise(
        async () => {
          const deleted = await service.softRemoveUser(identityAddress);
          //console.log('deleted: ', deleted);
          return deleted; // Return the deleted status
        },
        {
          pending: `Removing ${displayName}...`,
          success: (deleted) => {
            if (deleted) {
              return `${displayName} has been successfully removed.`;
            } else {
              throw new Error(`${displayName} couldn't be removed.`);
            }
          },
          error: `${displayName} couldn't be removed. Please try again later.`,
        }
      )
      .then(() => {
        fetchData(activeTab); // Trigger fetchData after removal is complete
      });
  };

  const handleRemoveIdentity = async (event, action, record) => {
    // Get wallet type from BlockchainSelectionManager (wallet-agnostic)
    const walletType = getWalletType();
    console.log("[IdentitiesPage] handleRemoveIdentity called with:", { walletType, isConnected, record });
    
    // Check if wallet is connected
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    if (walletType === 'managed') {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      // Use walletAddress for deletion (the actual blockchain address)
      // Fall back to identityAddress if walletAddress is not available  
      let addressToRemove = record.walletAddress || record.identityAddress;
      
      if (!addressToRemove) {
        toast.error('No address found for identity removal');
        return;
      }
      
      // For Stellar addresses, ensure they are uppercase
      // Stellar addresses start with G and are 56 characters long
      if (addressToRemove.length === 56 && addressToRemove[0].toLowerCase() === 'g') {
        addressToRemove = addressToRemove.toUpperCase();
      }
      
      const identities = [addressToRemove];
      for (const identity of identities) {
        try {
          await toast.promise(
            (async () => {
              // Step 1: Initiate Remove Identity
              const { initiateResponse, error: removeInitError } = await DfnsService.initiateRemoveIdentity(identity, user.walletId, dfnsToken);
              if (removeInitError) throw new Error(removeInitError);

              // Step 2: Complete Remove Identity
              const { completeResponse, error: removeCompleteError } = await DfnsService.completeRemoveIdentity(
                user.walletId,
                dfnsToken,
                initiateResponse.challenge,
                initiateResponse.requestBody
              );
              if (removeCompleteError) throw new Error(removeCompleteError);

              // Step 3: Delay before initiating Unregister Identity
              await delay(2000);

              // Step 4: Initiate Unregister Identity
              const { initiateResponse: unregisterInitResponse, error: unregisterInitError } = await DfnsService.initiateUnregisterIdentity(
                identity,
                user.walletId,
                dfnsToken
              );
              if (unregisterInitError) throw new Error(unregisterInitError);

              // Step 5: Complete Unregister Identity
              const { completeResponse: unregisterCompleteResponse, error: unregisterCompleteError } = await DfnsService.completeUnregisterIdentity(
                user.walletId,
                dfnsToken,
                unregisterInitResponse.challenge,
                unregisterInitResponse.requestBody
              );
              if (unregisterCompleteError) throw new Error(unregisterCompleteError);

              // Step 6: Delay before refreshing state
              await delay(2500);
              
              // Refresh wallet identity status to update the UI indicator
              const manager = BlockchainServiceManager.getInstance();
              await manager.refreshWalletIdentityStatus();
              
              setRefreshTrigger((prev) => !prev);
            })(),
            {
              pending: `Removing ${record?.displayName}...`,
              success: `Successfully removed ${record?.displayName}`,
              error: {
                render({ data }) {
                  return <div>{data?.reason || `An error occurred while removing ${record?.displayName}`}</div>;
                },
              },
            }
          );
        } catch (error) {
          console.error(`Error removing identity ${identity}:`, error);
        }
      }
    } else if (walletType === 'private') {
      // Show loading modal
      setTransactionModal({
        visible: true,
        status: 'loading',
        title: 'Removing Identity',
        loadingMessage: `Removing ${record?.displayName} from blockchain...`,
        successMessage: '',
        errorMessage: '',
        data: null
      });

      (async () => {
        try {
          // Use walletAddress for deletion (the actual blockchain address)
          // Fall back to identityAddress if walletAddress is not available
          let addressToRemove = record.walletAddress || record.identityAddress;
          
          if (!addressToRemove) {
            throw new Error('No address found for identity removal');
          }
          
          // For Stellar addresses, ensure they are uppercase
          // Stellar addresses start with G and are 56 characters long
          if (addressToRemove.length === 56 && addressToRemove[0].toLowerCase() === 'g') {
            addressToRemove = addressToRemove.toUpperCase();
          }
          
          // Keep addresses for blockchain operations, but also keep track of the record
          const identities = [addressToRemove];
          const recordToDelete = record;  // Save the full record object

          for (const identity of identities) {
            // Step 1: Remove identity from blockchain
            setTransactionModal(prev => ({
              ...prev,
              loadingMessage: 'Removing identity from blockchain...'
            }));

            // Try blockchain deletion - allow errors to propagate to outer catch
            await service.removeIdentity(identity);

            // Step 2: Skip unregisterIdentity as it's redundant with removeIdentity for Stellar
            // unregisterIdentity was calling the same remove_identity function on-chain
            // which was already called in Step 1, causing a "Identity not found" error

            // Step 3: Soft remove from database (only after blockchain succeeds)
            setTransactionModal(prev => ({
              ...prev,
              loadingMessage: 'Updating database...'
            }));

            // Sync to Parse - pass the full record object, not just the address
            await service.softRemoveUser(recordToDelete);
          }

          // Show success
          setTransactionModal({
            visible: true,
            status: 'success',
            title: 'Success',
            loadingMessage: '',
            successMessage: `Successfully removed ${record?.displayName}`,
            errorMessage: '',
            data: { identityName: record?.displayName }
          });

          // After successful removal, trigger a refresh of the component
          setRefreshTrigger((prev) => !prev);
        } catch (error) {
          console.error('[IdentitiesPage] Error removing identity:', error);
          setTransactionModal({
            visible: true,
            status: 'error',
            title: 'Error',
            loadingMessage: '',
            successMessage: '',
            errorMessage: error.message || `Failed to remove ${record?.displayName}`,
            data: null
          });
        }
      })();
    } else {
      // This should not happen with the wallet-agnostic approach
      console.error("[IdentitiesPage] Unknown wallet type:", walletType);
      toast.error("Unable to determine wallet type");
    }
  };

  const columns = [
    { label: "Identity", name: "displayName" },
    { label: "Address", name: "identityAddress", width: "350px" },
    { label: "KYC ID Account #", name: "kyc_id" },
    { label: "Flagged?", name: "flagged_account" },
    { label: "Claims", name: "claims" },
  ];
  // Pending tab shows identities without claims - same columns as regular identities
  const pendingColumns = [
    { label: "Identity", name: "displayName" },
    { label: "Address", name: "identityAddress", width: "350px" },
    { label: "KYC ID Account #", name: "kyc_id" },
    { label: "Flagged?", name: "flagged_account" },
    { label: "Claims", name: "claims" }, // Will be empty for pending identities
  ];

  const actions = [
    { label: "Edit Rules", name: NomyxAction.EditClaims },
    { label: "View", name: NomyxAction.ViewIdentity },
    {
      label: "Remove",
      name: NomyxAction.RemoveIdentity,
      confirmation: "Are you sure you want to remove this Identity?",
    },
  ];
  // Pending identities can have claims added to verify them
  const pendingActions = [
    { label: "Add Rules", name: NomyxAction.EditClaims }, // Primary action to add claims
    { label: "View", name: NomyxAction.ViewIdentity },
    {
      label: "Remove",
      name: NomyxAction.RemoveIdentity,
      confirmation: "Are you sure you want to remove this Identity?",
    },
  ];
  const claimsActions = [
    { label: "Add Rules", name: NomyxAction.AddClaims },
    { label: "View", name: NomyxAction.ViewIdentity },
    {
      label: "Remove",
      name: NomyxAction.RemoveIdentity,
      confirmation: "Are you sure you want to remove this Identity?",
    },
  ];
  const globalActions = [{ label: "Create identity", name: NomyxAction.CreateIdentity }];

  const search = true;

  const handleAction = async (event, action, record) => {
    switch (action) {
      case NomyxAction.CreateIdentity:
        navigate("/identities/create");
        break;
      case NomyxAction.ViewIdentity:
        navigate("/identities/" + record.id);
        break;
      case NomyxAction.ViewPendingIdentity:
        navigate("/identities/pending/" + record.id);
        break;
      case NomyxAction.EditClaims:
        navigate("/identities/" + record.id + "/edit");
        break;
      case NomyxAction.AddClaims:
        navigate("/identities/" + record.id + "/edit");
        break;
      case NomyxAction.RemoveIdentity:
        await handleRemoveIdentity(event, action, record);
        break;
      case NomyxAction.CreatePendingIdentity:
        const { displayName, kyc_id, identityAddress } = record;
        navigate(`/identities/create?displayName=${displayName}&walletAddress=${identityAddress}&accountNumber=${kyc_id}`);
        break;
      case NomyxAction.RemoveUser:
        await handleRemoveUser(record);
        break;
      default:
        console.log("Action not handled: ", action);
        break;
    }
  };

  const tabItems = [
    {
      key: "Identities",
      label: "Identities",
      children: (
        <ObjectList
          title="Identities"
          description="Identities represent individuals that can be related to Compliance Rules"
          columns={columns}
          actions={actions}
          globalActions={globalActions}
          search={search}
          data={identities}
          pageSize={10}
          onAction={handleAction}
          onGlobalAction={handleAction}
        />
      ),
    },
    {
      key: "Pending",
      label: "Pending",
      children: (
        <ObjectList
          title="Pending Verification"
          description="Identities without claim topics assigned (unverified). Assign claims to verify these identities."
          columns={pendingColumns}
          actions={pendingActions}
          globalActions={globalActions}
          search={search}
          data={pendingIdentities}
          pageSize={10}
          onAction={handleAction}
          onGlobalAction={handleAction}
        />
      ),
    },
    {
      key: "Claims",
      label: "Add Rules",
      children: (
        <ObjectList
          title="Add Rules"
          description="Identies that have yet to be related to Compliance Rules"
          columns={columns}
          actions={claimsActions}
          globalActions={globalActions}
          search={search}
          data={identities}
          pageSize={10}
          onAction={handleAction}
          onGlobalAction={handleAction}
        />
      ),
    },
  ];

  return (
    <>
      <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} />
      <TransactionModal
        visible={transactionModal.visible}
        status={transactionModal.status}
        title={transactionModal.title}
        loadingMessage={transactionModal.loadingMessage}
        successMessage={transactionModal.successMessage}
        errorMessage={transactionModal.errorMessage}
        data={transactionModal.data}
        onClose={() => setTransactionModal(prev => ({ ...prev, visible: false }))}
        autoCloseDelay={3000}
      />
    </>
  );
};

export default IdentitiesPage;
