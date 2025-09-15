import React, { useEffect, useState, useContext } from "react";

import { Button, Input } from "antd";
import Transfer from "antd/es/transfer";
import { useNavigate, useParams, useLocation } from "../hooks/useNextRouter";
import { toast } from "react-toastify";

import { RoleContext } from "../context/RoleContext";
import DfnsService from "../services/DfnsService";
import { WalletPreference } from "../utils/Constants";
import TransactionModal from "./shared/TransactionModal";
import WalletConnectionModal from "./WalletConnectionModal";
import PageCard from "./shared/PageCard";

const EditClaims = ({ service }) => {
  const navigate = useNavigate();
  const { id: identityId } = useParams(); // Fix: Changed from { identityId } to { id: identityId }
  const [identity, setIdentity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [claimTopics, setClaimTopics] = useState([]);
  const [targetKeys, setTargetKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const { walletPreference, user, dfnsToken } = useContext(RoleContext);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [transactionModal, setTransactionModal] = useState({
    visible: false,
    status: 'loading',
    title: 'Updating Identity Claims',
    loadingMessage: 'Processing claim updates...',
    successMessage: 'Claims updated successfully!',
    errorMessage: ''
  });

  // Handling the transfer box for compliance rules
  const onChange = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const onSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  // Save the selected compliance rules
  const saveClaims = async () => {
    // Add null check for identity object
    if (!identity) {
      toast.error("Identity not loaded. Please refresh the page.");
      return;
    }

    if (!service) {
      toast.error("Service not initialized. Please refresh the page.");
      return;
    }
    
    // Check if identity and address are properly loaded
    if (!identity || !identity.address) {
      console.error('[EditClaims] Cannot save claims - identity or address is missing:', identity);
      toast.error("Identity address not found. Please refresh the page and try again.");
      return;
    }
    
    // Convert any BigInt values to numbers before sending to the adapter
    const selectedClaimTopics = targetKeys.map(key => {
      if (typeof key === 'bigint') {
        return Number(key);
      }
      return typeof key === 'number' ? key : Number(key);
    });
    console.log(`[EditClaims] Saving claims for identity ${identity.address}:`, selectedClaimTopics);
    
    // Show transaction modal
    setTransactionModal({
      visible: true,
      status: 'loading',
      title: 'Updating Identity Claims',
      loadingMessage: 'Updating claims on blockchain...',
      successMessage: '',
      errorMessage: ''
    });
    
    try {
      // Simply set all selected claims - setClaims replaces all claims
      // This is simpler than trying to diff and add/remove individually
      const result = await service.setClaims(
        identity.address,
        selectedClaimTopics
      );
      
      // Check if wallet connection is required
      if (result && result.requiresWallet) {
        console.log('[EditClaims] Wallet connection required');
        setTransactionModal({ visible: false });
        setWalletModalVisible(true);
        return;
      }
      
      // Show success modal
      setTransactionModal({
        visible: true,
        status: 'success',
        title: 'Success',
        loadingMessage: '',
        successMessage: `Successfully updated claims for ${identity.displayName || identity.address}`,
        errorMessage: '',
        data: {
          'Identity': identity.displayName || `${identity.address.substring(0, 6)}...${identity.address.substring(identity.address.length - 4)}`,
          'Address': identity.address,
          'Claims Updated': selectedClaimTopics.length,
          'Claim IDs': selectedClaimTopics.join(', ') || 'None'
        }
      });
      
      // Navigate after a delay
      setTimeout(() => {
        navigate("/identities");
      }, 3000);
    } catch (error) {
      console.error('[EditClaims] Error saving claims:', error);
      
      // Format the error message for better readability
      let errorMessage = error.message || `Failed to update claims`;
      
      // Check if it's a permission/authorization error
      if (errorMessage.includes('No trusted issuer') || errorMessage.includes('not authorized')) {
        // The error message from the adapter is already user-friendly
        errorMessage = error.message;
      } else if (errorMessage.includes('UnexpectedSize') || errorMessage.includes('MismatchingParameterLen')) {
        errorMessage = 'There was a technical issue updating the claims. Please try again or contact support.';
      }
      
      setTransactionModal({
        visible: true,
        status: 'error',
        title: 'Unable to Update Claims',
        loadingMessage: '',
        successMessage: '',
        errorMessage: errorMessage
      });
    }
  };

  // Load data when component mounts or service changes
  useEffect(() => {
    const loadData = async () => {
      if (!service || !identityId) {
        console.log(`[EditClaims] Waiting for service (${!!service}) and identityId (${identityId})`);
        return;
      }

      const abortController = new AbortController();
      
      try {
        setIsLoading(true);

        // For now, we'll only use the claim topics from the blockchain
        // In the future, this could also load from Parse if needed
        console.log('[EditClaims] Fetching detailed claim topics with names');
        
        // Try to get detailed claim topics with names
        let data = [];
        const detailedTopics = await service.getClaimTopicsDetailed();
        
        if (detailedTopics && detailedTopics.length > 0) {
          // Use detailed topics with names
          data = detailedTopics.map(topic => ({
            key: topic.id,
            displayName: topic.name || `Claim Topic ${topic.id}`,
            topic: topic.id
          }));
        } else {
          // Fallback: get regular claim topics and generate names
          const availableTopics = await service.getClaimTopics();
          
          if (availableTopics && availableTopics.length > 0) {
            data = availableTopics.map(topicId => ({
              key: topicId,
              displayName: `Claim Topic ${topicId}`,
              topic: topicId
            }));
          }
        }
        
        // If still no topics, check if there are any compliance rules from Parse
        if (data.length === 0) {
          try {
            const result = await service.getComplianceRules();
            if (result && result.length > 0) {
              console.log('[EditClaims] Using compliance rules from Parse as fallback');
              data = result.map(rule => ({
                key: rule.attributes?.topic || rule.id,
                displayName: rule.attributes?.displayName || `Rule ${rule.id}`,
                topic: rule.attributes?.topic || rule.id
              }));
            }
          } catch (parseError) {
            console.log('[EditClaims] Could not fetch compliance rules from Parse:', parseError);
            // Continue with blockchain-only data
          }
        }
        
        // Always create at least one default topic if none exist
        if (data.length === 0) {
          console.error('[EditClaims] No claim topics found, using default');
          data = [{
            key: 1,
            displayName: 'KYC Verification',
            topic: 1
          }];
        }
        
        console.log('[EditClaims] Available claim topics:', data);
        
        // Skip the redundant code that overwrites data
        // The data variable already has the claim topics from above
        /*
        // Alternatively, get compliance rules if the blockchain doesn't have claim topics
        // This maintains backward compatibility with the Parse-based system
        let result = await service.getClaimTopics();
        if (!result || result.length === 0) {
          // Fallback to compliance rules from Parse if no claim topics on blockchain
          result = await service.getComplianceRules();
          
          // Map compliance rules to the format required by the Transfer component
          data = result.map((item) => {
            // Handle detailed format {id: number, name: string}
            if (item && typeof item === 'object' && 'id' in item && 'name' in item) {
              return {
                key: item.id,
                displayName: item.name,
                topic: item.id,
              };
            }
            // Handle format with attributes
            else if (item && item.attributes) {
              return {
                key: item.attributes.topic,
                displayName: item.attributes.displayName,
                topic: item.attributes.topic,
              };
            } 
            // Fallback for simple topic IDs
            else if (typeof item === 'number' || typeof item === 'string') {
              const topicId = Number(item);
              return {
                key: topicId,
                displayName: `Claim Topic ${topicId}`,
                topic: topicId,
              };
            } else {
              console.warn('[EditClaims] Unknown claim topic format:', item);
              return null;
            }
          }).filter(Boolean); // Remove any null entries
        }
        */
        
        // Set the claim topics that we already loaded above
        console.log('[EditClaims] Setting claim topics:', data);
        setClaimTopics(data);

        // Fetch the identity details
        console.log('[EditClaims] Fetching identity with ID:', identityId);
        let identityRecord = await service.getDigitalIdentity(identityId);
        
        // If getDigitalIdentity returns null (Parse error), try to get from blockchain data
        if (!identityRecord && identityId.startsWith('blockchain-')) {
          console.log('[EditClaims] Falling back to blockchain data for identity');
          const identities = await service.getActiveIdentities();
          const blockchainIdentity = identities.find(i => i.id === identityId);
          
          if (blockchainIdentity) {
            // Extract address from various possible structures
            let address = '';
            if (typeof blockchainIdentity.attributes?.address === 'string') {
              address = blockchainIdentity.attributes.address;
            } else if (blockchainIdentity.attributes?.address?.identityAddress) {
              address = blockchainIdentity.attributes.address.identityAddress;
            } else if (blockchainIdentity.attributes?.identityAddress) {
              address = blockchainIdentity.attributes.identityAddress;
            } else if (typeof blockchainIdentity.address === 'string') {
              address = blockchainIdentity.address;
            } else if (blockchainIdentity.identityAddress) {
              address = blockchainIdentity.identityAddress;
            }
            
            // Generate display name if not available
            const displayName = blockchainIdentity.attributes?.displayName || 
                              blockchainIdentity.displayName || 
                              (address ? `Identity ${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'Unknown Identity');
            
            // Map blockchain identity to expected format
            identityRecord = {
              displayName: displayName,
              address: address,
              accountNumber: blockchainIdentity.attributes?.accountNumber || 
                           blockchainIdentity.attributes?.kyc_id ||
                           blockchainIdentity.kyc_id || 
                           'N/A',  // Default value for better UX
              claims: []  // Will be fetched separately
            };
            
            // Try to get claims directly from blockchain
            if (address) {
              try {
                const identityClaims = await service.getIdentityClaims(address);
                identityRecord.claims = identityClaims || [];
                console.log(`[EditClaims] Retrieved ${identityRecord.claims.length} claims for address ${address}`);
              } catch (error) {
                console.error('[EditClaims] Error fetching claims from blockchain:', error);
              }
            }
          }
        }
        
        // If still no record, log detailed info
        if (!identityRecord) {
          console.error('[EditClaims] Could not load identity record for ID:', identityId);
          console.log('[EditClaims] Available identities:', await service.getActiveIdentities());
        }
        
        // Log the fetched identity record for debugging
        console.log('[EditClaims] Fetched identity record:', identityRecord);
        
        // Verify the address is present
        if (!identityRecord || !identityRecord.address) {
          console.error('[EditClaims] Identity record missing or has no address:', identityRecord);
          toast.error('Identity address not found. Please try refreshing the page.');
        }
        
        // Set identity and the initial target keys (current claims)
        const identityClaims = identityRecord?.claims || [];
        setIdentity(identityRecord);
        // Handle both object format {topic: 1} and plain number format
        // Also convert BigInt to number
        const claimKeys = identityClaims.map(claim => {
          let topic = typeof claim === 'object' ? claim.topic : claim;
          // Convert BigInt to number
          if (typeof topic === 'bigint') {
            return Number(topic);
          }
          return typeof topic === 'number' ? topic : Number(topic);
        });
        setTargetKeys(claimKeys);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error loading identity data:', error);
          toast.error('Failed to load identity data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [service, identityId, navigate]);

  const handleWalletConnect = async (walletInfo) => {
    console.log('[EditClaims] Wallet connected:', walletInfo);
    setWalletModalVisible(false);
    // Retry the operation after wallet connection
    saveClaims();
  };

  const handleWalletModalClose = (connected) => {
    setWalletModalVisible(false);
    if (!connected) {
      toast.error("Wallet connection cancelled");
    }
  };

  return (
    <PageCard title="Edit Rules for Selected Identity">
      <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px", fontWeight: "bold" }}>Select Rules</div>
        <Transfer
          dataSource={claimTopics}
          titles={["Available Topics", "Selected Topics"]}
          targetKeys={targetKeys}
          selectedKeys={selectedKeys}
          onChange={onChange}
          onSelectChange={onSelectChange}
          render={(item) => `${item.displayName} (${item.topic})`}
          listStyle={{
            width: 300,
            height: 400,
          }}
          disabled={!identity || isLoading}
        />
      </div>
      <div style={{ marginTop: "40px" }}>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "10px" }}>Investor Name</div>
          <Input placeholder="Investor Name" value={identity?.displayName || ""} disabled />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "10px" }}>Investor KYC Account Number</div>
          <Input placeholder="Investor KYC Account Number" value={identity?.accountNumber || ""} disabled />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "10px" }}>Investor Wallet Address</div>
          <Input placeholder="Investor Wallet Address" value={identity?.address || ""} disabled />
        </div>
      </div>
      <Button type="primary" onClick={saveClaims} loading={isLoading} disabled={!identity}>
        Save Claims
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
      
      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        visible={walletModalVisible}
        onClose={handleWalletModalClose}
        onConnect={handleWalletConnect}
      />
    </PageCard>
  );
};

export default EditClaims;