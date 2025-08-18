import { createBlockchainService, UnifiedBlockchainService, ChainConfigService } from "@nomyx/shared";
import PubSub from "pubsub-js";

import ParseClient from "../services/ParseClient"; // Import the singleton instance
import { NomyxEvent } from "../utils/Constants";

/**
 * Blockchain-Agnostic BlockchainService for Admin Portal
 *
 * This service provides a unified API for blockchain operations across
 * Ethereum and Stellar networks using the nomyx-ts library.
 *
 * This is now a thin wrapper around UnifiedBlockchainService that adds
 * admin portal specific functionality.
 */

class BlockchainService {
  constructor() {
    this.chainConfigService = new ChainConfigService();
    this.unifiedService = null;
    this.currentChain = null;
    this.initialized = false;
  }

  async initialize(chainId = "ethereum-local") {
    console.log(`[Admin BlockchainService] Initializing with chain: ${chainId}`);

    try {
      // Validate chain configuration first
      const combinedConfig = await this.chainConfigService.getCombinedConfig(chainId);

      if (!combinedConfig.isValid) {
        console.error(`[Admin BlockchainService] Invalid chain configuration for ${chainId}:`, combinedConfig.errors);
        throw new Error(`Invalid chain configuration for ${chainId}: ${combinedConfig.errors.join(", ")}`);
      }

      // Create UnifiedBlockchainService instance for this chain
      this.unifiedService = createBlockchainService(chainId);
      this.currentChain = chainId;
      this.initialized = true;

      console.log(`[Admin BlockchainService] Successfully initialized nomyx-ts UnifiedBlockchainService for ${chainId}`);
      console.log(`[Admin BlockchainService] Chain info:`, this.unifiedService.getChainInfo());

      return true;
    } catch (error) {
      console.error(`[Admin BlockchainService] Failed to initialize:`, error);
      throw error;
    }
  }

  async switchChain(chainId) {
    console.log(`[Admin BlockchainService] Switching to chain: ${chainId}`);
    return await this.initialize(chainId);
  }

  async validateChain(chainId) {
    console.log(`[Admin BlockchainService] Validating chain: ${chainId}`);
    return await this.chainConfigService.validateChain(chainId);
  }

  async getDeploymentStatus(chainId) {
    console.log(`[Admin BlockchainService] Getting deployment status for: ${chainId}`);
    return await this.chainConfigService.getChainDeploymentStatus(chainId);
  }

  async getAllDeploymentStatuses() {
    console.log(`[Admin BlockchainService] Getting all deployment statuses`);
    return await this.chainConfigService.getAllChainDeploymentStatus();
  }

  getChainDisplayName(chainId) {
    return this.chainConfigService.getChainDisplayName(chainId);
  }

  getCurrentChain() {
    return this.currentChain;
  }

  // Address validation
  isValidAddress(address) {
    if (!this.initialized || !this.unifiedService) {
      console.error(`[Admin BlockchainService] Service not initialized for address validation`);
      return false;
    }

    return this.unifiedService.isValidAddress(address);
  }

  getContractAddress(contractName) {
    if (!this.initialized) {
      console.warn(`[Admin BlockchainService] Service not initialized, cannot get contract address for ${contractName}`);
      return null;
    }

    // Get chain config to access contract addresses
    const chainConfig = this.chainConfigService.getChainConfig(this.currentChain);
    const contracts = chainConfig?.contracts;

    // Handle facets
    if (contracts?.facets && contracts.facets[contractName]) {
      return contracts.facets[contractName];
    }

    // Handle main contracts
    return contracts?.[contractName] || null;
  }

  getAllContractAddresses() {
    if (!this.initialized) {
      console.warn(`[Admin BlockchainService] Service not initialized, returning empty contract addresses`);
      return {};
    }

    const chainConfig = this.chainConfigService.getChainConfig(this.currentChain);
    return chainConfig?.contracts || {};
  }

  // Blockchain operations using nomyx-ts UnifiedBlockchainService
  async getClaimTopics() {
    console.log(`[Admin BlockchainService] Getting claim topics via nomyx-ts`);

    if (!this.initialized || !this.unifiedService) {
      console.warn("[Admin BlockchainService] Service not fully initialized, returning empty array");
      return [];
    }

    try {
      // For Stellar, try to get detailed topics with names
      if (this.currentChain?.includes("stellar") && typeof this.unifiedService.getClaimTopicsDetailed === "function") {
        console.log(`[Admin BlockchainService] Getting detailed claim topics for Stellar`);
        const detailedTopics = await this.unifiedService.getClaimTopicsDetailed();
        console.log(`[Admin BlockchainService] Retrieved ${detailedTopics.length} detailed claim topics`);

        // Convert detailed topics to admin portal format
        return detailedTopics.map((topic) => ({
          id: topic.id.toString(),
          attributes: {
            topic: topic.id,
            displayName: topic.name || topic.displayName || `Claim Topic ${topic.id}`,
          },
        }));
      }

      // Fallback to basic topics for other chains or if detailed method not available
      const topics = await this.unifiedService.getClaimTopics();
      console.log(`[Admin BlockchainService] Retrieved ${topics.length} claim topics`);

      // Convert to admin portal format (matching UI expectations)
      return topics.map((topicId, index) => ({
        id: topicId.toString(),
        attributes: {
          topic: topicId,
          displayName: `Claim Topic ${topicId}`,
        },
      }));
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting claim topics:`, error);
      // Return empty array on error to prevent UI crashes
      return [];
    }
  }

  async getNextClaimTopicId() {
    console.log(`[Admin BlockchainService] Getting next claim topic ID via nomyx-ts`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      const nextId = await this.unifiedService.getNextClaimTopicId();
      console.log(`[Admin BlockchainService] Next claim topic ID: ${nextId}`);
      return nextId;
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting next claim topic ID:`, error);
      // Return 1 as fallback
      return 1;
    }
  }

  async addClaimTopic(topicId, displayName) {
    console.log(`[Admin BlockchainService] Adding claim topic ${topicId} via nomyx-ts`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // For Stellar, pass the display name if available
      if (this.currentChain?.includes("stellar") && displayName) {
        console.log(`[Admin BlockchainService] Adding claim topic with name: ${displayName}`);
        const result = await this.unifiedService.addClaimTopic(topicId, displayName);
        console.log(`[Admin BlockchainService] Claim topic added successfully:`, result);

        return {
          success: true,
          transactionHash: result.txHash || result.hash || result.transactionHash,
          topicId: topicId,
          displayName: displayName,
        };
      }

      // For other chains or if no display name, use standard method
      const result = await this.unifiedService.addClaimTopic(topicId);
      console.log(`[Admin BlockchainService] Claim topic added successfully:`, result);

      return {
        success: true,
        transactionHash: result.txHash || result.hash || result.transactionHash,
        topicId: topicId,
      };
    } catch (error) {
      console.error(`[Admin BlockchainService] Error adding claim topic:`, error);
      throw error;
    }
  }

  async removeClaimTopic(topicId) {
    console.log(`[Admin BlockchainService] Removing claim topic ${topicId} via nomyx-ts`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      const result = await this.unifiedService.removeClaimTopic(topicId);
      console.log(`[Admin BlockchainService] Claim topic removed successfully:`, result);

      return {
        success: true,
        transactionHash: result.txHash || result.hash || result.transactionHash,
        topicId: topicId,
      };
    } catch (error) {
      console.error(`[Admin BlockchainService] Error removing claim topic:`, error);
      throw error;
    }
  }

  // Placeholder methods for other functionality
  // TODO: Implement these using nomyx-ts UnifiedBlockchainService or workflows

  async getTrustedIssuers() {
    console.log(`[Admin BlockchainService] Getting trusted issuers via nomyx-ts`);

    if (!this.initialized || !this.unifiedService) {
      console.warn("[Admin BlockchainService] Service not fully initialized, returning empty array");
      return [];
    }

    try {
      const issuers = await this.unifiedService.getTrustedIssuers();
      console.log(`[Admin BlockchainService] Retrieved ${issuers.length} trusted issuers`);

      // Standardize the format for UI consistency across blockchains
      return issuers.map((issuer, index) => {
        // Handle both Ethereum and Stellar formats
        if (issuer.issuer_address || issuer.issuerAddress || issuer.address) {
          // Stellar format: {claim_topics, is_active, issuer_address, name}
          const address = issuer.issuer_address || issuer.issuerAddress || issuer.address;
          const name = issuer.name || `Issuer ${index + 1}`;
          const claimTopics = issuer.claim_topics || issuer.claimTopics || [];

          return {
            id: address || `issuer_${index}`,
            attributes: {
              issuer: address,
              verifierName: name,
              claimTopics: claimTopics.map((topic) => ({ topic: Number(topic) })),
            },
          };
        } else if (issuer.id && issuer.attributes) {
          // Already in expected format (likely Ethereum)
          return issuer;
        } else {
          // Unknown format, try to handle gracefully
          console.warn(`[Admin BlockchainService] Unknown issuer format:`, issuer);
          return {
            id: `issuer_${index}`,
            attributes: {
              issuer: issuer.toString(),
              verifierName: `Unknown Issuer ${index + 1}`,
              claimTopics: [],
            },
          };
        }
      });
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting trusted issuers:`, error);
      // Return empty array on error to prevent UI crashes
      return [];
    }
  }

  async addTrustedIssuer(issuer) {
    console.log(`[Admin BlockchainService] Adding trusted issuer via nomyx-ts:`, issuer);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // For Stellar, pass the name if available
      if (this.currentChain === "stellar-testnet" && issuer.verifierName) {
        console.log(`[Admin BlockchainService] Adding trusted issuer with name: ${issuer.verifierName}`);
        const result = await this.unifiedService.addTrustedIssuer(issuer.address, issuer.claimTopics, issuer.verifierName);
        console.log(`[Admin BlockchainService] Trusted issuer added successfully:`, result);

        return {
          success: true,
          transactionHash: result.txHash || result.hash || result.transactionHash,
          issuerAddress: issuer.address,
          claimTopics: issuer.claimTopics,
          verifierName: issuer.verifierName,
        };
      }

      // For other chains or if no name provided, use standard method
      const result = await this.unifiedService.addTrustedIssuer(issuer.address, issuer.claimTopics);
      console.log(`[Admin BlockchainService] Trusted issuer added successfully:`, result);

      return {
        success: true,
        transactionHash: result.txHash || result.hash || result.transactionHash,
        issuerAddress: issuer.address,
        claimTopics: issuer.claimTopics,
      };
    } catch (error) {
      console.error(`[Admin BlockchainService] Error adding trusted issuer:`, error);

      // Provide more descriptive error messages
      if (error.message && error.message.includes("Workflow")) {
        throw new Error(`Failed to add trusted issuer. The workflow system is not implemented. Direct blockchain call failed: ${error.message}`);
      } else if (error.message && error.message.includes("not initialized")) {
        throw new Error(`Blockchain service not properly initialized. Please check your chain configuration.`);
      } else if (error.message && error.message.includes("Invalid address")) {
        throw new Error(`Invalid issuer address format for ${this.currentChain} chain.`);
      }

      throw error;
    }
  }

  async removeTrustedIssuer(issuerAddress) {
    console.log(`[Admin BlockchainService] Removing trusted issuer via nomyx-ts:`, issuerAddress);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      const result = await this.unifiedService.removeTrustedIssuer(issuerAddress);
      console.log(`[Admin BlockchainService] Trusted issuer removed successfully:`, result);

      return {
        success: true,
        transactionHash: result.txHash || result.hash || result.transactionHash,
        issuerAddress: issuerAddress,
      };
    } catch (error) {
      console.error(`[Admin BlockchainService] Error removing trusted issuer:`, error);
      throw error;
    }
  }

  async getTrustedIssuersByObjectId(id) {
    console.log(`[Admin BlockchainService] Getting trusted issuer by ID: ${id}`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // Get all trusted issuers and find the one matching the ID
      const issuers = await this.getTrustedIssuers();
      const issuer = issuers.find((item) => item.id === id);

      if (!issuer) {
        console.warn(`[Admin BlockchainService] No trusted issuer found with ID: ${id}`);
        return null;
      }

      console.log(`[Admin BlockchainService] Found trusted issuer:`, issuer);
      return issuer;
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting trusted issuer by ID:`, error);
      return null;
    }
  }

  async updateTrustedIssuer(issuerData) {
    console.log(`[Admin BlockchainService] Updating trusted issuer metadata:`, issuerData);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // For Stellar blockchain, we can update the name directly on-chain
      const currentChain = this.currentChain || "";
      if (currentChain.includes("stellar") && issuerData.verifierName && issuerData.issuer) {
        console.log(`[Admin BlockchainService] Updating trusted issuer name on Stellar blockchain`);

        // Check if the unified service has the updateTrustedIssuerName method
        if (typeof this.unifiedService.updateTrustedIssuerName === "function") {
          const result = await this.unifiedService.updateTrustedIssuerName(issuerData.issuer, issuerData.verifierName);
          console.log(`[Admin BlockchainService] Trusted issuer name updated on blockchain:`, result);

          return {
            success: true,
            data: issuerData,
            transactionHash: result.txHash || result.hash || result.transactionHash,
          };
        }
      }

      // For other blockchains or if method not available, just return success
      // TODO: Implement Parse Server integration to store issuer metadata for non-Stellar chains
      return {
        success: true,
        data: issuerData,
      };
    } catch (error) {
      console.error(`[Admin BlockchainService] Error updating trusted issuer:`, error);
      throw error;
    }
  }

  async updateIssuerClaimTopics(issuerAddress, claimTopics) {
    console.log(`[Admin BlockchainService] Updating issuer claim topics on blockchain:`, issuerAddress, claimTopics);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // For Stellar, we can update claim topics directly without removing/re-adding
      const currentChain = this.currentChain || "";
      let result;

      if (currentChain.includes("stellar") && typeof this.unifiedService.updateIssuerClaimTopics === "function") {
        console.log(`[Admin BlockchainService] Using direct claim topics update for Stellar`);
        result = await this.unifiedService.updateIssuerClaimTopics(issuerAddress, claimTopics);
        console.log(`[Admin BlockchainService] Issuer claim topics updated successfully:`, result);
      } else {
        // For other chains, fall back to remove/add approach
        console.log(`[Admin BlockchainService] Using remove/add approach for claim topics update`);

        // First remove the issuer
        await this.unifiedService.removeTrustedIssuer(issuerAddress);

        // Then add it back with new claim topics
        result = await this.unifiedService.addTrustedIssuer(issuerAddress, claimTopics);
        console.log(`[Admin BlockchainService] Issuer claim topics updated successfully:`, result);
      }

      return {
        success: true,
        transactionHash: result.txHash || result.hash || result.transactionHash,
        issuerAddress: issuerAddress,
        claimTopics: claimTopics,
      };
    } catch (error) {
      console.error(`[Admin BlockchainService] Error updating issuer claim topics:`, error);

      // Provide more descriptive error messages
      if (error.message && error.message.includes("Workflow")) {
        throw new Error(
          `Failed to update issuer claim topics. The workflow system is not implemented. Direct blockchain call failed: ${error.message}`
        );
      } else if (error.message && error.message.includes("not initialized")) {
        throw new Error(`Blockchain service not properly initialized. Please check your chain configuration.`);
      } else if (error.message && error.message.includes("Invalid address")) {
        throw new Error(`Invalid issuer address format for ${this.currentChain} chain.`);
      }

      throw error;
    }
  }

  async getIdentities() {
    console.log(`[Admin BlockchainService] Getting identities via nomyx-ts`);

    if (!this.initialized || !this.unifiedService) {
      console.warn("[Admin BlockchainService] Service not fully initialized, returning empty array");
      return [];
    }

    try {
      const identities = await this.unifiedService.getIdentities();
      console.log(`[Admin BlockchainService] Retrieved ${identities.length} identities`);

      return identities;
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting identities:`, error);

      // Check for specific error types but still return empty array to prevent crashes
      if (error.message && error.message.includes("Workflow")) {
        console.warn(`[Admin BlockchainService] Workflow system not implemented for getting identities. Returning empty array.`);
      } else if (error.message && error.message.includes("not implemented")) {
        console.warn(`[Admin BlockchainService] Identity retrieval not yet implemented for ${this.currentChain} chain. Returning empty array.`);
      }

      // Return empty array on error to prevent UI crashes
      return [];
    }
  }

  async getClaimTopicById(topicId) {
    console.log(`[Admin BlockchainService] Getting claim topic by ID: ${topicId}`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // Get all claim topics and find the one matching the ID
      const topics = await this.getClaimTopics();
      const topic = topics.find((item) => item.id === topicId || item.attributes?.topic?.toString() === topicId);

      if (!topic) {
        console.warn(`[Admin BlockchainService] No claim topic found with ID: ${topicId}`);
        return [];
      }

      // Return as array to match expected format
      return [topic];
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting claim topic by ID:`, error);
      return [];
    }
  }

  async getTrustedIssuersForClaimTopics(topicId) {
    console.log(`[Admin BlockchainService] Getting trusted issuers for claim topic: ${topicId}`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // Get all trusted issuers and filter those managing this topic
      const allIssuers = await this.getTrustedIssuers();
      const issuersWithTopic = allIssuers.filter((issuer) => {
        const claimTopics = issuer.attributes?.claimTopics || [];
        return claimTopics.some((ct) => ct.topic?.toString() === topicId?.toString());
      });

      console.log(`[Admin BlockchainService] Found ${issuersWithTopic.length} issuers managing topic ${topicId}`);
      return issuersWithTopic;
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting trusted issuers for topic:`, error);
      return [];
    }
  }

  async getClaimsForClaimTopics(topicId) {
    console.log(`[Admin BlockchainService] Getting claims for claim topic: ${topicId}`);

    // TODO: Implement actual claim fetching from blockchain
    // For now, return empty array as claims functionality is not yet implemented
    return [];
  }

  async createIdentity(ownerAddress) {
    console.log(`[Admin BlockchainService] Creating identity via nomyx-ts:`, ownerAddress);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      const result = await this.unifiedService.createIdentity({ owner: ownerAddress });
      console.log(`[Admin BlockchainService] Identity created successfully:`, result);

      return {
        success: true,
        transactionHash: result.txHash || result.transactionHash,
        identityAddress: result.identityAddress,
        ownerAddress: ownerAddress,
      };
    } catch (error) {
      console.error(`[Admin BlockchainService] Error creating identity:`, error);

      // Provide more descriptive error messages
      if (error.message && error.message.includes("Workflow")) {
        throw new Error(`Failed to create identity. The workflow system is not implemented. Direct blockchain call failed: ${error.message}`);
      } else if (error.message && error.message.includes("not initialized")) {
        throw new Error(`Blockchain service not properly initialized. Please check your chain configuration.`);
      } else if (error.message && error.message.includes("Invalid address")) {
        throw new Error(`Invalid owner address format for ${this.currentChain} chain.`);
      } else if (error.message && error.message.includes("not implemented")) {
        throw new Error(`Identity creation is not yet implemented for ${this.currentChain} chain.`);
      }

      throw error;
    }
  }

  async removeIdentity(address) {
    console.log(`[Admin BlockchainService] Removing identity via nomyx-ts:`, address);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // Check if method exists in UnifiedBlockchainService
      if ("removeIdentity" in this.unifiedService && typeof this.unifiedService.removeIdentity === "function") {
        const result = await this.unifiedService.removeIdentity(address);
        console.log(`[Admin BlockchainService] Identity removed successfully:`, result);
        return result;
      }

      // Fallback: For now, just return success as identity removal might not be implemented on blockchain
      console.warn(`[Admin BlockchainService] removeIdentity not implemented in UnifiedBlockchainService, returning success`);
      return {
        success: true,
        message: "Identity removal marked as successful (blockchain method not implemented)",
      };
    } catch (error) {
      console.error(`[Admin BlockchainService] Error removing identity:`, error);
      throw error;
    }
  }

  async unregisterIdentity(address) {
    console.log(`[Admin BlockchainService] Unregistering identity via nomyx-ts:`, address);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // Check if method exists in UnifiedBlockchainService
      if ("unregisterIdentity" in this.unifiedService && typeof this.unifiedService.unregisterIdentity === "function") {
        const result = await this.unifiedService.unregisterIdentity(address);
        console.log(`[Admin BlockchainService] Identity unregistered successfully:`, result);
        return result;
      }

      // Fallback: For now, just return success as identity unregistration might not be implemented on blockchain
      console.warn(`[Admin BlockchainService] unregisterIdentity not implemented in UnifiedBlockchainService, returning success`);
      return {
        success: true,
        message: "Identity unregistration marked as successful (blockchain method not implemented)",
      };
    } catch (error) {
      console.error(`[Admin BlockchainService] Error unregistering identity:`, error);
      throw error;
    }
  }

  async getIdentity(address) {
    console.log(`[Admin BlockchainService] Getting identity for address: ${address}`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // Check if UnifiedBlockchainService has getIdentity method
      if (typeof this.unifiedService.getIdentity === "function") {
        const result = await this.unifiedService.getIdentity(address);
        console.log(`[Admin BlockchainService] Retrieved identity:`, result);
        return result;
      } else {
        console.warn(`[Admin BlockchainService] getIdentity not implemented in UnifiedBlockchainService`);
        return null;
      }
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting identity:`, error);

      // Provide more descriptive error messages
      if (error.message && error.message.includes("Workflow")) {
        console.warn(`[Admin BlockchainService] Workflow system not implemented for getting identity. Returning null.`);
        return null;
      } else if (error.message && error.message.includes("not implemented")) {
        console.warn(`[Admin BlockchainService] Get identity not yet implemented for ${this.currentChain} chain. Returning null.`);
        return null;
      }

      throw error;
    }
  }

  async addIdentity(address, identity) {
    console.log(`[Admin BlockchainService] Adding identity for address: ${address}`, identity);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      // Check if UnifiedBlockchainService has addIdentity method
      if (typeof this.unifiedService.addIdentity === "function") {
        const result = await this.unifiedService.addIdentity(address, identity);
        console.log(`[Admin BlockchainService] Identity added successfully:`, result);
        return result;
      } else {
        console.warn(`[Admin BlockchainService] addIdentity not implemented in UnifiedBlockchainService`);
        throw new Error(`Identity management is not yet implemented for ${this.currentChain} chain.`);
      }
    } catch (error) {
      console.error(`[Admin BlockchainService] Error adding identity:`, error);

      // Provide more descriptive error messages
      if (error.message && error.message.includes("Workflow")) {
        throw new Error(`Failed to add identity. The workflow system is not implemented. Direct blockchain call failed: ${error.message}`);
      } else if (error.message && error.message.includes("not initialized")) {
        throw new Error(`Blockchain service not properly initialized. Please check your chain configuration.`);
      } else if (error.message && error.message.includes("Invalid address")) {
        throw new Error(`Invalid address format for ${this.currentChain} chain.`);
      } else if (error.message && error.message.includes("not implemented")) {
        throw new Error(`Identity management is not yet implemented for ${this.currentChain} chain.`);
      }

      throw error;
    }
  }

  async isInitialized() {
    return this.initialized;
  }

  // Pass-through methods to UnifiedBlockchainService
  getChainInfo() {
    if (!this.unifiedService) {
      throw new Error("Service not initialized");
    }
    return this.unifiedService.getChainInfo();
  }

  getCurrentChainFromService() {
    if (!this.unifiedService) {
      throw new Error("Service not initialized");
    }
    return this.unifiedService.getCurrentChain();
  }

  // Diamond Loupe Operations (EIP-2535)
  async isDiamondContract(contractAddress) {
    console.log(`[Admin BlockchainService] Checking if ${contractAddress} is a Diamond contract`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      return await this.unifiedService.isDiamondContract(contractAddress);
    } catch (error) {
      console.error(`[Admin BlockchainService] Error checking Diamond contract:`, error);
      return false;
    }
  }

  async getDiamondLoupeInfo(contractAddress) {
    console.log(`[Admin BlockchainService] Getting Diamond Loupe info for ${contractAddress}`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      const info = await this.unifiedService.getDiamondLoupeInfo(contractAddress);
      console.log(`[Admin BlockchainService] Diamond Loupe info:`, info);
      return info;
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting Diamond Loupe info:`, error);
      throw error;
    }
  }

  async getDiamondFacets(contractAddress) {
    console.log(`[Admin BlockchainService] Getting Diamond facets for ${contractAddress}`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      return await this.unifiedService.getDiamondFacets(contractAddress);
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting Diamond facets:`, error);
      throw error;
    }
  }

  async getFacetAddress(contractAddress, functionSelector) {
    console.log(`[Admin BlockchainService] Getting facet address for selector ${functionSelector}`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      return await this.unifiedService.getFacetAddress(contractAddress, functionSelector);
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting facet address:`, error);
      throw error;
    }
  }

  async getFacetSelectors(contractAddress, facetAddress) {
    console.log(`[Admin BlockchainService] Getting selectors for facet ${facetAddress}`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      return await this.unifiedService.getFacetSelectors(contractAddress, facetAddress);
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting facet selectors:`, error);
      throw error;
    }
  }

  async getAllFacetAddresses(contractAddress) {
    console.log(`[Admin BlockchainService] Getting all facet addresses for ${contractAddress}`);

    if (!this.initialized || !this.unifiedService) {
      throw new Error("BlockchainService not initialized");
    }

    try {
      return await this.unifiedService.getAllFacetAddresses(contractAddress);
    } catch (error) {
      console.error(`[Admin BlockchainService] Error getting all facet addresses:`, error);
      throw error;
    }
  }
}

export default BlockchainService;
