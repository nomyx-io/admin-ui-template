import ParseClient, { Parse } from "./ParseClient";
import parseServerClient from "./ParseServerClient";
import WalletProtectedService from "./WalletProtectedService";

/**
 * IdentityService - A hybrid service that combines blockchain operations with Parse database operations
 * This service provides identity management functionality including fetching active and pending identities
 */
class IdentityService {
  constructor(blockchainService, onWalletRequired) {
    // Wrap blockchain service with wallet protection
    this.blockchainService = new WalletProtectedService(blockchainService, onWalletRequired);
    this.parseClient = ParseClient;
    this.Parse = Parse;
    this.parseAuthFailed = false; // Cache Parse auth status to avoid repeated failures
    this.lastParseAttempt = 0; // Track last Parse attempt time
  }

  // Delegate blockchain operations to BlockchainService
  async initialize() {
    return this.blockchainService.initialize();
  }

  async isInitialized() {
    return this.blockchainService.isInitialized();
  }

  async getChainInfo() {
    return this.blockchainService.getChainInfo();
  }

  async getCurrentChain() {
    return this.blockchainService.getCurrentChain();
  }

  async getIdentities() {
    return this.blockchainService.getIdentities();
  }

  async createIdentity(address) {
    return this.blockchainService.createIdentity({ owner: address });
  }

  async getIdentity(address) {
    return this.blockchainService.getIdentity(address);
  }

  async addIdentity(address, identity) {
    return this.blockchainService.addIdentity(address, identity);
  }

  async isValidAddress(address) {
    return this.blockchainService.isValidAddress(address);
  }

  // Identity-specific Parse operations using Cloud functions
  async getActiveIdentities(chain = null) {
    // Extract chain ID if chain is an object
    let chainId = null;
    if (chain) {
      if (typeof chain === 'string') {
        // If it's already a string, check if it's a network passphrase
        if (chain.includes('Network') && chain.includes(';')) {
          // This is a Stellar network passphrase, convert to chain ID
          if (chain.includes('Standalone')) {
            chainId = 'stellar-local';
          } else if (chain.includes('Test')) {
            chainId = 'stellar-testnet';
          } else if (chain.includes('Public')) {
            chainId = 'stellar-mainnet';
          } else {
            chainId = chain;
          }
        } else {
          chainId = chain;
        }
      } else if (typeof chain === 'object' && chain !== null) {
        // Handle chain object - could have id, chainId, networkId, or name
        chainId = chain.id || chain.chainId || chain.networkId || chain.name || null;
        
        // If we got a network passphrase instead, convert it
        if (chainId && chainId.includes('Network') && chainId.includes(';')) {
          if (chainId.includes('Standalone')) {
            chainId = 'stellar-local';
          } else if (chainId.includes('Test')) {
            chainId = 'stellar-testnet';
          } else if (chainId.includes('Public')) {
            chainId = 'stellar-mainnet';
          }
        }
      }
    }
    
    console.log("[IdentityService] getActiveIdentities called with chain:", chain, "resolved to chainId:", chainId);
    
    try {
      // Use API route with Master Key (bypasses session token issue)
      const cloudResult = await parseServerClient.getActiveIdentities(chainId);
      
      if (cloudResult && Array.isArray(cloudResult)) {
        console.log("[IdentityService] Retrieved identities via API route");
        return cloudResult;
      }
    } catch (error) {
      console.log("[IdentityService] API route failed:", error.message);
    }
    
    // Fall back to blockchain data
    console.log("[IdentityService] Falling back to blockchain data for identities");
    try {
      // Force fresh fetch from blockchain by clearing any cache
      if (this.blockchainService.clearIdentityCache) {
        await this.blockchainService.clearIdentityCache();
      }
      
      console.log("[IdentityService] Calling blockchainService.getIdentities()");
      const blockchainIdentities = await this.blockchainService.getIdentities();
      console.log(`[IdentityService] Got ${blockchainIdentities ? blockchainIdentities.length : 0} identities from blockchain`);
      if (blockchainIdentities && Array.isArray(blockchainIdentities)) {
        return blockchainIdentities.map((identity, index) => {
          // Handle both object and string formats
          const identityAddress = typeof identity === 'string' 
            ? identity 
            : (identity.identityAddress || identity.userAddress || identity.address || '');
          
          const addressStr = String(identityAddress);
          const displayName = addressStr 
            ? `Identity ${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`
            : 'Unknown Identity';
          
          return {
            id: `blockchain-${Date.now()}-${index}`, // Add timestamp to force re-render
            attributes: {
              address: identityAddress,
              identityAddress: identityAddress,
              displayName: displayName,
              status: typeof identity === 'object' ? (identity.status || "active") : "active",
              chain: chainId,
              claims: []
            },
            className: "Identity",
            createdAt: new Date(),
            updatedAt: new Date()
          };
        });
      }
    } catch (blockchainError) {
      console.log("[IdentityService] Blockchain fetch also failed:", blockchainError.message);
    }
    return [];
  }

  async getPendingIdentities() {
    try {
      // Use API route with Master Key (bypasses session token issue)
      const cloudResult = await parseServerClient.getPendingIdentities();
      
      if (cloudResult && Array.isArray(cloudResult)) {
        console.log("[IdentityService] Retrieved pending identities via API route");
        return cloudResult;
      }
    } catch (error) {
      console.log("[IdentityService] API route failed:", error.message);
    }
    
    // Return empty array as fallback
    return [];
  }

  async updateIdentity(walletAddress, data) {
    try {
      // First try blockchain update
      if (this.blockchainService.updateIdentity) {
        await this.blockchainService.updateIdentity(walletAddress, data);
      }

      // Use Cloud function with Master Key to update/create identity in Parse
      try {
        // Extract only the simple fields that Parse can handle
        // Remove complex nested objects like chain and address
        const parseData = {
          displayName: data.displayName,
          walletAddress: data.walletAddress,
          accountNumber: data.accountNumber,
          status: data.status || 'active',
          // Extract chain ID if it's an object, otherwise use the value
          // Priority: id > chainId > networkId > name > chain > network
          chain: typeof data.chain === 'object' 
            ? (data.chain.id || data.chain.chainId || data.chain.networkId || data.chain.name || data.chain.chain || data.chain.network || 'unknown') 
            : (data.chain || 'unknown'),
          // Store the identity address as a simple string
          identityAddress: data.address?.identityAddress || data.walletAddress
        };
        
        console.log("[IdentityService] Updating identity via Cloud function with simplified data:", walletAddress, parseData);
        const result = await parseServerClient.updateIdentity(walletAddress, parseData);
        console.log("[IdentityService] Identity updated successfully via Cloud function");
        return true;
      } catch (parseError) {
        console.log("[IdentityService] Cloud function update failed:", parseError.message);
        // Don't fail completely if Parse update fails but blockchain succeeded
        return true;
      }
    } catch (error) {
      console.error("[IdentityService] Error updating identity:", error);
      throw error;
    }
  }

  async isUser(walletAddress) {
    try {
      const User = this.Parse.Object.extend("User");
      const query = new this.Parse.Query(User);
      query.equalTo("walletAddress", walletAddress.toLowerCase());
      
      const user = await query.first();
      return !!user;
    } catch (error) {
      console.error("[IdentityService] Error checking if user exists:", error);
      return false;
    }
  }

  async approveUser(walletAddress) {
    try {
      const User = this.Parse.Object.extend("User");
      const query = new this.Parse.Query(User);
      query.equalTo("walletAddress", walletAddress.toLowerCase());
      
      const user = await query.first();
      if (user) {
        user.set("approved", true);
        user.set("status", "approved");
        await user.save();
      }
      
      return true;
    } catch (error) {
      console.error("[IdentityService] Error approving user:", error);
      throw error;
    }
  }

  // Claim management methods
  async setClaims(address, claimTopics) {
    try {
      // Try to set claims on blockchain first
      const result = await this.blockchainService.setClaims(address, claimTopics);

      // If successful on blockchain, also update in Parse
      await this.updateIdentityClaims(address, claimTopics);

      return result;
    } catch (blockchainError) {
      console.error("[IdentityService] Blockchain setClaims failed:", blockchainError);

      // Re-throw the error - do not update Parse if blockchain fails
      // This ensures blockchain remains the source of truth
      throw blockchainError;
    }
  }
  
  // Helper method to update claims in Parse
  async updateIdentityClaims(address, claimTopics) {
    try {
      // Find the identity by address
      const identities = await this.getActiveIdentities();
      const identity = identities.find(i => {
        // Handle both Parse format (direct fields) and blockchain format (attributes)
        const walletAddr = i.walletAddress || i.attributes?.walletAddress || '';
        const identityAddr = i.identityAddress || i.attributes?.identityAddress || '';
        const nestedAddr = i.attributes?.address?.identityAddress || '';
        
        // Compare addresses (case-insensitive for non-Stellar)
        const normalizedAddress = address.toLowerCase();
        return walletAddr.toLowerCase() === normalizedAddress ||
               identityAddr.toLowerCase() === normalizedAddress ||
               nestedAddr.toLowerCase() === normalizedAddress ||
               walletAddr === address || // For Stellar (case-sensitive)
               identityAddr === address ||
               nestedAddr === address;
      });
      
      if (identity) {
        // Update the identity with new claims
        // Convert any BigInt values to regular numbers for JSON serialization
        const data = {
          claims: (claimTopics || []).map(topic => 
            typeof topic === 'bigint' ? Number(topic) : topic
          )
        };
        
        console.log("[IdentityService] Updating identity claims in Parse:", identity.id, data);
        await parseServerClient.updateIdentity(address, data);
      } else {
        console.error("[IdentityService] Could not find identity for address:", address);
      }
    } catch (error) {
      console.error("[IdentityService] Failed to update claims in Parse:", error);
    }
  }

  async removeClaim(address, claimTopic) {
    return this.blockchainService.removeClaim(address, claimTopic);
  }

  async getIdentityClaims(address) {
    return this.blockchainService.getIdentityClaims(address);
  }

  // Delegate all other methods to BlockchainService
  async switchChain(chain) {
    return this.blockchainService.switchChain(chain);
  }

  async getClaimTopics() {
    return this.blockchainService.getClaimTopics();
  }
  
  async getClaimTopicsDetailed() {
    // Try to get detailed claim topics with names from blockchain
    if (this.blockchainService.getClaimTopicsDetailed) {
      return this.blockchainService.getClaimTopicsDetailed();
    }
    // Fallback to basic claim topics
    return this.blockchainService.getClaimTopics();
  }

  async addClaimTopic(topicId, topicName) {
    return this.blockchainService.addClaimTopic(topicId, topicName);
  }

  async getTrustedIssuers() {
    return this.blockchainService.getTrustedIssuers();
  }

  async addTrustedIssuer(data) {
    return this.blockchainService.addTrustedIssuer(data);
  }

  async getTrustedIssuersByObjectId(id) {
    return this.blockchainService.getTrustedIssuersByObjectId(id);
  }

  async getTrustedIssuersForClaimTopics(claimTopics) {
    return this.blockchainService.getTrustedIssuersForClaimTopics(claimTopics);
  }

  async getClaimsForClaimTopics(claimTopics) {
    return this.blockchainService.getClaimsForClaimTopics(claimTopics);
  }

  async getClaimTopicById(topicId) {
    return this.blockchainService.getClaimTopicById(topicId);
  }

  async updateTrustedIssuer(id, data) {
    return this.blockchainService.updateTrustedIssuer(id, data);
  }

  async updateIssuerClaimTopics(issuerId, claimTopics) {
    return this.blockchainService.updateIssuerClaimTopics(issuerId, claimTopics);
  }

  async removeTrustedIssuer(address) {
    return this.blockchainService.removeTrustedIssuer(address);
  }

  async removeClaimTopic(topicId) {
    return this.blockchainService.removeClaimTopic(topicId);
  }

  async removeIdentity(address) {
    return this.blockchainService.removeIdentity(address);
  }

  async unregisterIdentity(address) {
    return this.blockchainService.unregisterIdentity(address);
  }
  
  async softRemoveUser(identity) {
    try {
      // Extract the identity ID and address from the identity object
      let identityId = null;
      let addressString = null;

      if (typeof identity === 'string') {
        // If a string is passed, it's likely the address (legacy behavior)
        addressString = identity;
      } else if (identity && typeof identity === 'object') {
        // Extract ID from the identity object
        identityId = identity.objectId || identity.id;
        addressString = identity.identityAddress || identity.walletAddress;
      }

      console.log("[IdentityService] Soft removing user from Parse:", { identityId, addressString });

      // If we have an ID, use it for deletion. Otherwise fall back to address
      const deleteParam = identityId || addressString;

      if (!deleteParam) {
        throw new Error("No identity ID or address provided for deletion");
      }

      // Use Cloud function to delete/soft-delete the identity
      const result = await parseServerClient.deleteIdentity(deleteParam);
      
      if (result && result.success) {
        console.log("[IdentityService] Identity soft deleted successfully from Parse");
        return true;
      }
      
      console.log("[IdentityService] Identity deletion result:", result);
      return false;
    } catch (error) {
      console.error("[IdentityService] Error soft removing user:", error);
      // Don't fail completely if Parse delete fails but blockchain succeeded
      return false;
    }
  }

  async getContractAddress(contractName) {
    return this.blockchainService.getContractAddress(contractName);
  }

  async getAllContractAddresses() {
    return this.blockchainService.getAllContractAddresses();
  }

  async getDeploymentStatus() {
    return this.blockchainService.getDeploymentStatus();
  }

  async getAllDeploymentStatuses() {
    return this.blockchainService.getAllDeploymentStatuses();
  }

  async getChainDisplayName() {
    return this.blockchainService.getChainDisplayName();
  }

  async validateChain(chainId) {
    return this.blockchainService.validateChain(chainId);
  }

  async getNextClaimTopicId() {
    return this.blockchainService.getNextClaimTopicId();
  }

  async isDiamondContract() {
    return this.blockchainService.isDiamondContract();
  }

  async getDiamondLoupeInfo() {
    return this.blockchainService.getDiamondLoupeInfo();
  }

  async getDiamondFacets() {
    return this.blockchainService.getDiamondFacets();
  }

  async getFacetAddress(selector) {
    return this.blockchainService.getFacetAddress(selector);
  }

  async getFacetSelectors(facetAddress) {
    return this.blockchainService.getFacetSelectors(facetAddress);
  }

  async getAllFacetAddresses() {
    return this.blockchainService.getAllFacetAddresses();
  }

  async getCurrentChainFromService() {
    return this.blockchainService.getCurrentChainFromService();
  }

  async getDigitalIdentity(identityId) {
    // If this is a blockchain-generated ID, skip Parse entirely and use blockchain data
    if (identityId?.includes('blockchain-')) {
      console.log("[IdentityService] Blockchain ID detected, fetching from blockchain data");
      
      // Get identity data from blockchain
      const activeIdentities = await this.getActiveIdentities();
      const identity = activeIdentities.find(i => i.id === identityId);
      
      if (identity) {
        // Handle both scenarios: identity.attributes exists or identity has direct properties
        const attributes = identity.attributes || identity;
        
        // Handle the address field which could be a string or an object
        let address = "";
        if (typeof attributes.address === 'string') {
          address = attributes.address;
        } else if (attributes.address && typeof attributes.address === 'object') {
          address = attributes.address.identityAddress || "";
        } else if (attributes.identityAddress) {
          address = attributes.identityAddress;
        }
        
        // Try to fetch claims directly from blockchain for this address
        let claims = [];
        if (address && this.blockchainService) {
          try {
            claims = await this.blockchainService.getIdentityClaims(address);
            console.log(`[IdentityService] Retrieved ${claims.length} claims for ${address} from blockchain`);
          } catch (error) {
            console.error("[IdentityService] Error fetching claims from blockchain:", error);
            // Fallback to attributes claims if blockchain fetch fails
            claims = identity.attributes.claims || [];
          }
        }
        
        return {
          displayName: attributes.displayName || `Identity ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
          address: address,
          accountNumber: attributes.accountNumber || attributes.kyc_id || "",
          personaData: null,
          watchlistMatched: false,
          pepMatched: false,
          claims: claims
        };
      }
      
      // If not found in blockchain data, return null
      console.error("[IdentityService] Identity not found in blockchain data:", identityId);
      return null;
    }
    
    // For non-blockchain IDs, use Cloud function
    console.log("[IdentityService] Calling getIdentityById with identityId:", identityId);
    try {
      const result = await parseServerClient.getIdentityById(identityId);

      if (result) {
        console.log("[IdentityService] Retrieved identity via API route");
        return result;
      }
      
      console.error("[IdentityService] Identity not found:", identityId);
      return null;
    } catch (error) {
      console.error("[IdentityService] Error fetching digital identity:", error);
      return null;
    }
  }
}

export default IdentityService;