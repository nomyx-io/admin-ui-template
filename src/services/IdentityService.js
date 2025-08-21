import ParseClient, { Parse } from "./ParseClient";

/**
 * IdentityService - A hybrid service that combines blockchain operations with Parse database operations
 * This service provides identity management functionality including fetching active and pending identities
 */
class IdentityService {
  constructor(blockchainService) {
    this.blockchainService = blockchainService;
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

  // Identity-specific Parse operations
  async getActiveIdentities(chain = null) {
    // Skip Parse if we know auth has failed recently (within last 5 minutes)
    const now = Date.now();
    const skipParse = this.parseAuthFailed && (now - this.lastParseAttempt) < 300000; // 5 minutes
    
    if (!skipParse) {
      try {
        const Identity = this.Parse.Object.extend("Identity");
        const query = new this.Parse.Query(Identity);
        query.equalTo("status", "active");
        
        // Filter by chain if provided
        if (chain) {
          query.equalTo("chain", chain);
        }
        
        query.descending("createdAt");
        query.limit(1000); // Adjust limit as needed
        
        const results = await query.find();
        
        // If we get here, Parse auth is working
        this.parseAuthFailed = false;
        
        return results.map(identity => ({
          id: identity.id,
          attributes: identity.attributes,
          className: identity.className,
          createdAt: identity.createdAt,
          updatedAt: identity.updatedAt
        }));
      } catch (error) {
        // Handle authentication errors - Parse operations require auth we don't have
        // This is expected behavior - we'll use blockchain data instead
        if (error.code === 119 || error.code === 403 || error.code === 209 || 
            error.message?.includes('unauthorized') || error.message?.includes('Forbidden') ||
            error.message?.includes('Invalid session token')) {
          
          // Mark Parse auth as failed and record the time
          this.parseAuthFailed = true;
          this.lastParseAttempt = now;
          
          // Only log once every 5 minutes to reduce console noise
          if ((now - this.lastParseAttempt) > 300000) {
            console.log("[IdentityService] Parse authentication not available. Using blockchain data.");
          }
        } else {
          console.error("[IdentityService] Error fetching active identities:", error);
        }
      }
    }
    
    // Fall back to blockchain data
    try {
      // Force fresh fetch from blockchain by clearing any cache
      if (this.blockchainService.clearIdentityCache) {
        await this.blockchainService.clearIdentityCache();
      }
      
      const blockchainIdentities = await this.blockchainService.getIdentities();
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
              chain: chain,
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
    // Skip Parse if we know auth has failed recently (within last 5 minutes)
    const now = Date.now();
    const skipParse = this.parseAuthFailed && (now - this.lastParseAttempt) < 300000; // 5 minutes
    
    if (skipParse) {
      // Return empty array without attempting Parse
      return [];
    }
    
    try {
      const Identity = this.Parse.Object.extend("Identity");
      const query = new this.Parse.Query(Identity);
      query.equalTo("status", "pending");
      query.descending("createdAt");
      query.limit(1000); // Adjust limit as needed
      
      const results = await query.find();
      
      // If we get here, Parse auth is working
      this.parseAuthFailed = false;
      
      return results.map(identity => ({
        id: identity.id,
        attributes: identity.attributes,
        className: identity.className,
        createdAt: identity.createdAt,
        updatedAt: identity.updatedAt
      }));
    } catch (error) {
      // Handle 403 Forbidden errors (Identity class requires authentication not available in browser)
      // This is expected in development environments without Parse Master Key
      if (error.code === 119 || error.code === 403 || error.message?.includes('unauthorized') || error.message?.includes('Forbidden')) {
        // Mark Parse auth as failed and record the time
        this.parseAuthFailed = true;
        this.lastParseAttempt = now;
        
        // Only log once every 5 minutes to reduce console noise
        if ((now - this.lastParseAttempt) > 300000) {
          console.log("[IdentityService] Identity class requires authentication (expected in development). No pending identities available.");
        }
        return [];
      }
      console.error("[IdentityService] Error fetching pending identities:", error);
      return [];
    }
  }

  async updateIdentity(walletAddress, data) {
    try {
      // First try blockchain update
      if (this.blockchainService.updateIdentity) {
        await this.blockchainService.updateIdentity(walletAddress, data);
        return true; // If blockchain update succeeds, consider it successful
      }

      // Then try to update in Parse (may fail with 403 in development)
      try {
        const Identity = this.Parse.Object.extend("Identity");
        const query = new this.Parse.Query(Identity);
        query.equalTo("walletAddress", walletAddress.toLowerCase());
        
        let identity = await query.first();
        if (!identity) {
          // Create new identity if it doesn't exist
          identity = new Identity();
          identity.set("walletAddress", walletAddress.toLowerCase());
        }
        
        // Update all fields
        Object.keys(data).forEach(key => {
          identity.set(key, data[key]);
        });
        
        await identity.save();
      } catch (parseError) {
        // Handle 403 Forbidden errors gracefully
        if (parseError.code === 403 || parseError.message?.includes('Forbidden')) {
          console.log("[IdentityService] Parse update skipped (authentication required in development)");
          // Don't throw error if Parse fails but blockchain succeeded
          return true;
        }
        throw parseError;
      }
      
      return true;
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

  // Delegate all other methods to BlockchainService
  async switchChain(chain) {
    return this.blockchainService.switchChain(chain);
  }

  async getClaimTopics() {
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
  
  async softRemoveUser(address) {
    try {
      // Update the identity status in Parse to "removed" or similar
      const Identity = this.Parse.Object.extend("Identity");
      const query = new this.Parse.Query(Identity);
      
      // Handle both string and object address formats
      const addressString = typeof address === 'string' ? address : (address?.identityAddress || address);
      
      query.equalTo("address.identityAddress", addressString);
      
      const identity = await query.first();
      if (identity) {
        identity.set("status", "removed");
        await identity.save();
        return true;
      }
      return false;
    } catch (error) {
      console.error("[IdentityService] Error soft removing user:", error);
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
    try {
      const Identity = this.Parse.Object.extend("Identity");
      const query = new this.Parse.Query(Identity);
      const identity = await query.get(identityId);
      
      if (!identity) {
        console.error("[IdentityService] Identity not found:", identityId);
        return null;
      }
      
      const attributes = identity.attributes;
      
      // Handle both string and object address formats
      let identityAddress = "";
      if (typeof attributes.address === 'string') {
        identityAddress = attributes.address;
      } else if (attributes.address && typeof attributes.address === 'object') {
        identityAddress = attributes.address.identityAddress || "";
      }
      
      return {
        displayName: attributes.displayName || "",
        address: identityAddress,
        accountNumber: attributes.accountNumber || attributes.kyc_id || "",
        personaData: attributes.personaVerificationData ? JSON.parse(attributes.personaVerificationData) : null,
        watchlistMatched: attributes.watchlistMatched || false,
        pepMatched: attributes.pepMatched || false,
        claims: attributes.claims || []
      };
    } catch (error) {
      // Handle 403 Forbidden errors gracefully
      if (error.code === 403 || error.message?.includes('Forbidden')) {
        console.log("[IdentityService] Identity details not accessible (authentication required in development)");
        // Return mock data for development
        return {
          displayName: "Mock Identity",
          address: identityId,
          accountNumber: "DEV-" + identityId.substring(0, 8),
          personaData: null,
          watchlistMatched: false,
          pepMatched: false,
          claims: []
        };
      }
      console.error("[IdentityService] Error fetching digital identity:", error);
      return null;
    }
  }
}

export default IdentityService;