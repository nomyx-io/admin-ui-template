import { ethers } from "ethers";
import Parse from "parse";
import PubSub from "pubsub-js";

import * as ClaimTopicsRegistry from "../abi/IClaimTopicsRegistry.json";
import * as IdentityFactory from "../abi/IdentityFactory.json";
import * as IdentityRegistry from "../abi/IIdentityRegistry.json";
import * as MinterFacet from "../abi/IMinterFacet.json";
import * as TrustedIssuersRegistry from "../abi/ITrustedIssuersRegistry.json";
import ParseClient from "../services/ParseClient"; // Import the singleton instance
import { waitFor } from "../utils";
import { NomyxEvent } from "../utils/Constants";

class BlockchainService {
  claimTopicsAbi = ClaimTopicsRegistry.default.abi;
  identityRegistryAbi = IdentityRegistry.default.abi;
  trustedIssuersRegistryAbi = TrustedIssuersRegistry.default.abi;
  identityFactoryAbi = IdentityFactory.default.abi;
  mintAbi = MinterFacet.default.abi;

  constructor(provider, contractAddress, identityRegistryAddress) {
    this.contractAddress = contractAddress;
    this.provider = provider;

    this.dedicatedProvider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);

    if (provider instanceof ethers.providers.Web3Provider) {
      console.log("🔹 Web3 Wallet Detected, setting signer...");
      this.signer = provider.getSigner();
    } else {
      if (provider instanceof ethers.providers.StaticJsonRpcProvider) {
        this.signer = null; // Read-only mode
        provider.polling = false;
        provider._pollingInterval = Infinity;
      }
    }

    console.log("blockchain service provider: ", this.provider);
    console.log("blockchain service signer: ", this.signer);

    // ✅ Use the best available provider for contracts (signer for transactions, provider for reads)
    const contractProvider = this.signer || this.provider;

    // ✅ Initialize smart contracts
    this.claimTopicRegistryService = new ethers.Contract(contractAddress, this.claimTopicsAbi, contractProvider);
    this.identityRegistryService = new ethers.Contract(contractAddress, this.identityRegistryAbi, contractProvider);
    this.trustedIssuersRegistryService = new ethers.Contract(contractAddress, this.trustedIssuersRegistryAbi, contractProvider);
    this.identityFactoryService = new ethers.Contract(identityRegistryAddress, this.identityFactoryAbi, contractProvider);
    this.mintService = new ethers.Contract(contractAddress, this.mintAbi, contractProvider);

    // Mint Registry
    this.mint = this.mint.bind(this);

    // Claim Topics Registry
    this.addClaimTopic = this.addClaimTopic.bind(this);
    this.removeClaimTopic = this.removeClaimTopic.bind(this);
    this.getClaimTopics = this.getClaimTopics.bind(this);

    // Identity Registry
    this.createIdentity = this.createIdentity.bind(this);
    this.getIdentity = this.getIdentity.bind(this);
    this.addIdentity = this.addIdentity.bind(this);
    this.getDigitalIdentity = this.getDigitalIdentity.bind(this);
    this.getActiveIdentities = this.getActiveIdentities.bind(this);
    this.getPendingIdentities = this.getPendingIdentities.bind(this);
    this.updateIdentity = this.updateIdentity.bind(this);
    this.createParseIdentity = this.createParseIdentity.bind(this);
    this.batchAddIdentity = this.batchAddIdentity.bind(this);
    this.removeIdentity = this.removeIdentity.bind(this);
    this.unregisterIdentity = this.unregisterIdentity.bind(this);
    this.softRemoveUser = this.softRemoveUser.bind(this);
    this.approveUser = this.approveUser.bind(this);
    this.setClaims = this.setClaims.bind(this);
    this.addClaim = this.addClaim.bind(this);
    this.removeClaim = this.removeClaim.bind(this);
    this.contains = this.contains.bind(this);
    this.isVerified = this.isVerified.bind(this);
    this.identity = this.identity.bind(this);
    this.getRegistryUsers = this.getRegistryUsers.bind(this);
    this.isRegistryUser = this.isRegistryUser.bind(this);
    this.getClaims = this.getClaims.bind(this);
    this.getClaim = this.getClaim.bind(this);
    this.hasClaim = this.hasClaim.bind(this);
    this.getTrustedIssuersByObjectId = this.getTrustedIssuersByObjectId.bind(this);

    // Trusted Issuers Registry
    this.addTrustedIssuer = this.addTrustedIssuer.bind(this);
    this.removeTrustedIssuer = this.removeTrustedIssuer.bind(this);
    this.updateIssuerClaimTopics = this.updateIssuerClaimTopics.bind(this);
    this.getTrustedIssuers = this.getTrustedIssuers.bind(this);
    this.isTrustedIssuer = this.isTrustedIssuer.bind(this);
    this.getTrustedIssuerClaimTopics = this.getTrustedIssuerClaimTopics.bind(this);
    this.hasClaimTopic = this.hasClaimTopic.bind(this);

    // Token Project
    this.getTokenProjects = this.getTokenProjects.bind(this);

    this.claimTopicRegistryService.on(NomyxEvent.ClaimTopicAdded, (claimTopic) => PubSub.publish(NomyxEvent.ClaimTopicAdded, claimTopic));
    this.claimTopicRegistryService.on(NomyxEvent.ClaimTopicRemoved, (claimTopic) => PubSub.publish(NomyxEvent.ClaimTopicRemoved, claimTopic));
    this.trustedIssuersRegistryService.on(NomyxEvent.ClaimTopicsUpdated, (trustedIssuer, claimTopics) =>
      PubSub.publish(NomyxEvent.ClaimTopicsUpdated, {
        trustedIssuer,
        claimTopics,
      })
    );
    this.trustedIssuersRegistryService.on(NomyxEvent.TrustedIssuerAdded, (trustedIssuer, claimTopics) =>
      PubSub.publish(NomyxEvent.TrustedIssuerAdded, {
        trustedIssuer,
        claimTopics,
      })
    );
    this.trustedIssuersRegistryService.on(NomyxEvent.TrustedIssuerRemoved, (trustedIssuer) =>
      PubSub.publish(NomyxEvent.TrustedIssuerRemoved, trustedIssuer)
    );
    this.identityRegistryService.on(NomyxEvent.ClaimAdded, (claimId, topic, scheme, issuer, signature, data, uri) =>
      PubSub.publish(NomyxEvent.ClaimAdded, {
        claimId,
        topic,
        scheme,
        issuer,
        signature,
        data,
        uri,
      })
    );
    this.identityRegistryService.on(NomyxEvent.ClaimRemoved, (claimId, topic, scheme, issuer, signature, data, uri) =>
      PubSub.publish(NomyxEvent.ClaimRemoved, {
        claimId,
        topic,
        scheme,
        issuer,
        signature,
        data,
        uri,
      })
    );
    this.identityRegistryService.on(NomyxEvent.IdentityAdded, (address, identity) => PubSub.publish(NomyxEvent.IdentityAdded, { address, identity }));
    this.identityRegistryService.on(NomyxEvent.IdentityRemoved, (address, identity) =>
      PubSub.publish(NomyxEvent.IdentityRemoved, { address, identity })
    );
    this.identityRegistryService.on(NomyxEvent.IdentityCountryUpdated, (identity, country) =>
      PubSub.publish(NomyxEvent.IdentityCountryUpdated, { identity, country })
    );
    this.identityRegistryService.on(NomyxEvent.ClaimAdded, (identity, claimTopic, claim) =>
      PubSub.publish(NomyxEvent.ClaimAdded, { identity, claimTopic, claim })
    );
    this.identityRegistryService.on(NomyxEvent.ClaimRemoved, (identity, claimTopic) =>
      PubSub.publish(NomyxEvent.ClaimRemoved, { identity, claimTopic })
    );
  }

  // Event listeners
  publish(event, data) {
    PubSub.publish(event, data);
  }

  subscribe(event, handler) {
    return PubSub.subscribe(event, handler);
  }

  unsubscribe(token) {
    return PubSub.unsubscribe(token);
  }

  async mint(metaData) {
    const contractWithSigner = this.mintService.connect(this.signer);
    const tx = await contractWithSigner.gemforceMint(metaData);
    return await tx.wait();
  }

  async addClaimTopic(claimTopic) {
    const contractWithSigner = this.claimTopicRegistryService.connect(this.signer);
    const tx = await contractWithSigner.addClaimTopic(claimTopic);
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      throw new Error(`addClaimTopic transaction failed (txHash: ${receipt.transactionHash})`);
    }
    return receipt.transactionHash;
  }

  async updateClaimTopic(txhash,claimTopic) {
    const {topic, displayName } = claimTopic;
    const topicKey = String(topic);

    await waitFor(
      async () => {
        const rows = await ParseClient.getRecords("ClaimTopic", ["transactionHash"], [txhash], [], 1, 0, "createdAt", "desc");
        return rows?.length ? rows[0] : null;
      },
      { timeoutMs: 30000, intervalMs: 1000, maxIntervalMs: 4000, label: `ClaimTopicAdded event for topic ${topicKey}` }
    );

    await ParseClient.updateExistingRecord("ClaimTopic", ["transactionHash"], [txhash], { topic: topicKey, displayName });

    return await waitFor(
      async () => {
        const rows = await ParseClient.getRecords("ClaimTopic", ["topic"], [topicKey], [], 1);
        const row = rows?.[0];
        return row?.attributes?.displayName === displayName ? row : null;
      },
      { timeoutMs: 10000, intervalMs: 500, maxIntervalMs: 2000, label: `ClaimTopic.displayName for topic ${topicKey}` }
    );
  }

  async removeClaimTopic(claimTopic) {
    const contractWithSigner = this.claimTopicRegistryService.connect(this.signer);
    const tx = await contractWithSigner.removeClaimTopic(claimTopic);
    await tx.wait();
    return tx;
  }

  async getClaimTopics() {
    return await ParseClient.getRecords("ClaimTopic", [], [], ["*"]);
  }

  async getNextClaimTopicId() {
    const result = await ParseClient.getRecords("ClaimTopic", [], [], ["topic"], 1, 0, "createdAt", "desc");
    let highestTopicId = result.length > 0 ? Number.parseInt(result[0].attributes.topic) + 1 : 1;
    return highestTopicId;
  }

  async getClaimTopicById(id) {
    const claimTopic = await ParseClient.getRecords("ClaimTopic", ["objectId"], [id], ["*"]);
    return claimTopic;
  }

  async getTrustedIssuersForClaimTopics(id) {
    const trustedIssuer = await ParseClient.getRecords("TrustedIssuer", ["claimTopics.topic"], [id]);
    return trustedIssuer;
  }

  async getTrustedIssuersByObjectId(id) {
    const results = await ParseClient.getRecords("TrustedIssuer", ["objectId"], [id]);

    let trustedIssuer = null;

    if (results.length > 0) {
      trustedIssuer = results[0];
    }

    return trustedIssuer;
  }

  /**
   * Retrieves claims associated with a specific claim topic
   * @param {string} id - The object ID of the claim topic
   * @returns {Array} - Array of claims or empty array if none found
   */
  async getClaimsForClaimTopics(id) {
    try {
      // Validate input
      if (!id) {
        return [];
      }

      // Get the claim topic details
      const claimTopicObj = await ParseClient.getRecords("ClaimTopic", ["objectId"], [id]);
      if (!claimTopicObj || claimTopicObj.length === 0) {
        return [];
      }

      // Extract the topic value
      const claimTopicValue = claimTopicObj[0].attributes.topic;

      // Get claims using the topic value directly
      const claimTopics = await ParseClient.getRecords("Claim", ["topic"], [claimTopicValue], ["*"]);

      // Ensure we have valid claim data
      if (!claimTopics || !Array.isArray(claimTopics)) {
        return [];
      }

      // Re-implement identity filtering with proper error handling
      try {
        // Get identities that contain this claim topic
        const identities = await ParseClient.getRecords("Identity", ["claims"], [claimTopicValue]);

        // Only filter if we have valid identities data
        if (identities && Array.isArray(identities) && identities.length > 0) {
          return claimTopics.filter(
            (claim) => claim?.attributes?.identity && identities.some((identity) => identity?.attributes?.identity === claim.attributes.identity)
          );
        }
      } catch (filterError) {
        // If filtering fails, fall back to returning all claims
      }

      // Return all claims if filtering is not possible
      return claimTopics;
    } catch (error) {
      // Log error but don't expose details to client
      console.error("Error in getClaimsForClaimTopics:", error);
      return [];
    }
  }

  async getActiveIdentities() {
    try {
      const identities = await ParseClient.getRecords("Identity", ["active"], [true], ["*"]);

      if (identities && identities.length > 0) {
        const claims = await ParseClient.getRecords("Claim", ["active"], [true], ["identityObj", "claimTopicObj"]);

        if (claims && claims.length > 0) {
          for (const identity of identities) {
            const walletAddress = identity.get("walletAddress");

            if (walletAddress) {
              const userRecords = await ParseClient.getRecords("User", ["walletAddress"], [walletAddress], ["pepMatched", "watchlistMatched"]);
              if (userRecords.length > 0) {
                const user = userRecords[0];
                identity.pepMatched = user.attributes?.pepMatched || false;
                identity.watchlistMatched = user.attributes?.watchlistMatched || false;
                identity.personaVerificationData = user.attributes?.personaVerificationData || null;
              }
            }

            // Claims for this identity
            const activeClaims = claims.filter((claim) => {
              const identityObj = claim.get("identityObj");
              return identityObj && identityObj.id === identity.id;
            });

            // Sort them by topic
            const sortedClaims = activeClaims.sort((a, b) => {
              const topicA = a.attributes?.claimTopicObj?.attributes?.topic || "";
              const topicB = b.attributes?.claimTopicObj?.attributes?.topic || "";
              return topicA > topicB ? 1 : -1;
            });

            // Store in _claims for safe frontend access
            identity._claims = sortedClaims;
          }
        }
      }

      return identities;
    } catch (error) {
      console.error("Error fetching active identities or claims:", error);
      throw error;
    }
  }

  async getPendingIdentities() {
    const users = await ParseClient.getRecords("_User", ["pendingApproval", "denied"], [true, false], ["*"]);
    return users;
  }

  async getAddClaimIdentities() {
    const identities = await ParseClient.getRecords("Identity", ["active"], [true], ["*"]);
    if (identities && identities.length > 0) {
      const claims = await ParseClient.getRecords("Claim", ["active"], [true], ["identityObj", "claimTopicObj"]);

      for (let i = 0; i < identities.length; i++) {
        const identity = identities[i];

        // Filter and map claims to the corresponding identity
        const activeClaims = claims.filter((claim) => claim.get("identityObj").id === identity.id);
        identity.attributes.claims = { children: activeClaims };

        // Sort the claims by topic
        identity.attributes.claims.children.sort((a, b) => {
          return a.attributes.claimTopicObj.attributes.topic > b.attributes.claimTopicObj.attributes.topic ? 1 : -1;
        });
      }

      // Filter identities to only include those without claims
      const identitiesWithoutClaims = identities.filter((identity) => !identity.attributes.claims.children.length);

      return identitiesWithoutClaims;
    }

    return [];
  }

  async softRemoveUser(identityAddress) {
    // set pending approval and denied to false
    return await ParseClient.updateExistingRecord("_User", ["walletAddress"], [identityAddress], { denied: true });
  }

  async createIdentity(identity) {
    try {
      console.log("this.signer", this.signer);
      const contract = this.identityFactoryService.connect(this.signer);
      const tx = await contract.createIdentity(identity);
      await tx.wait();
      return tx;
    } catch (error) {
      console.log("createIdentity error", error);
    }
  }

  async getIdentity(address, retries = 5, delay = 1000) {
    const contract = this.identityFactoryService.connect(this.signer);

    for (let attempt = 0; attempt < retries; attempt++) {
      const tx = await contract.getIdentity(address);

      if (tx && tx !== "0x0000000000000000000000000000000000000000") {
        // Ensure valid identity
        console.log(`✅ Identity found: ${tx}`);
        return tx;
      }

      console.warn(`🔄 Identity not found yet, retrying... Attempt ${attempt + 1}/${retries}`);
      await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
    }

    console.error("❌ Identity retrieval failed after multiple attempts.");
    throw new Error("Identity not found");
  }

  async updateIdentity(identity, identityData) {
    const maxRetries = 3,
      baseDelay = 4000;

    if (!identityData) {
      console.warn("No identity data provided, skipping update.");
      return null;
    }

    // Retry helper function
    async function retryWithBackoff(fn, retries, delay) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const result = await fn();
          if (result) return result; // Return if successful
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
        }

        if (attempt < retries) {
          const waitTime = delay * attempt; // Exponential backoff
          console.log(`Retrying in ${waitTime / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
      console.error("Update failed after max retry attempts.");
      return null;
    }

    // Perform the update with retry
    return retryWithBackoff(() => ParseClient.updateExistingRecord("Identity", ["address"], [identity], identityData), maxRetries, baseDelay);
  }

  async createParseIdentity(identity, identityData) {
    return await ParseClient.createRecord("_User", ["address"], [identity], identityData);
  }

  async isUser(identityAddress) {
    const user = await ParseClient.getRecord("_User", ["walletAddress"], [identityAddress]);
    return user ? true : false;
  }

  async approveUser(identityAddress) {
    return await ParseClient.updateExistingRecord("_User", ["walletAddress"], [identityAddress], { pendingApproval: false });
  }

  async addIdentity(identity, identityData) {
    const contract = this.identityRegistryService.connect(this.signer);
    const tx = await contract.addIdentity(identity, identityData);
    await tx.wait();
    return tx;
  }

  async getDigitalIdentity(id) {
    // Fetch the identity record based on the given ID
    const identities = await ParseClient.getRecords("Identity", ["objectId"], [id], ["*"]);
    const identity = identities.length > 0 ? identities[0] : null;
    const user = (await ParseClient.getRecords("_User", ["personaReferenceId"], [identity.attributes.accountNumber], ["*"]))[0];
    const claims = await ParseClient.getRecords("ClaimTopic", undefined, undefined, ["*"]);

    // If no identity is found, return null
    if (!identity) {
      return null;
    }

    const claimAdded = await ParseClient.getRecords("ClaimAdded__e", ["identity"], [identity.attributes.identity], ["claimTopic", "blockHash"]);

    // Map claimTopics to blockHashes for easy lookup
    const blockHashMap = claimAdded.reduce((acc, record) => {
      acc[record.attributes.claimTopic] = record.attributes.blockHash;
      return acc;
    }, {});

    // Retrieve identity claims and filter them
    const identityClaims = identity.attributes.claims || [];
    const matchedClaims = claims
      .filter((claim) => identityClaims.includes(claim?.attributes?.topic))
      .map((claim) => ({
        ...claim.attributes, // Include all original claim properties
        blockHash: blockHashMap[claim.attributes.topic] || null, // Add blockHash if match is found
      }));
    // Return the identity along with its attributes, including the claims directly from the record
    return {
      ...identity, // The identity object itself
      ...identity.attributes, // Spread the attributes of the identity for easier access
      claims: matchedClaims || [], // Return claims from identity attributes or an empty array
      personaData:
        user && user.attributes.personaVerificationData ? JSON.parse(user.attributes.personaVerificationData ?? "")?.data?.attributes : null,
      pepMatched: user && user.attributes.pepMatched,
      watchlistMatched: user && user.attributes.watchlistMatched,
    };
  }

  async batchAddIdentity(identities, identityDatas) {
    const contract = this.identityRegistryService.connect(this.signer);
    const tx = await contract.batchAddIdentity(identities, identityDatas);
    await tx.wait();
    return tx;
  }

  async removeIdentity(identity) {
    const contract = this.identityFactoryService.connect(this.signer);
    const tx = await contract.removeIdentity(identity);
    await tx.wait();
    return tx;
  }

  async unregisterIdentity(identity) {
    const contract = this.identityRegistryService.connect(this.signer);
    const tx = await contract.removeIdentity(identity);
    await tx.wait();
    return tx;
  }

  async setClaims(identity, claims) {
    const contract = this.identityRegistryService.connect(this.signer);
    const tx = await contract.setClaims(identity, claims);
    const txs = await tx.wait();

    return txs;
  }

  async addClaim(identity, claimTopic, claim) {
    const contract = this.identityRegistryService.connect(this.signer);
    const tx = await contract.addClaim(identity, claimTopic, claim);
    await tx.wait();
    return tx;
  }

  async removeClaim(identity, claimTopicObject) {
    try {
      console.log("claimTopicObject", claimTopicObject);
      // Extract the 'topic' field if claimTopicObject is an object
      const claimTopic = claimTopicObject.topic;

      // Ensure claimTopic is a valid BigNumber-compatible value
      if (!claimTopic || isNaN(Number(claimTopic))) {
        throw new Error(`Invalid claimTopic value: ${claimTopic}`);
      }

      const contract = this.identityRegistryService.connect(this.signer);
      const tx = await contract.removeClaim(identity, claimTopic); // Pass valid claimTopic
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error in removeClaim:", error);
    }
  }

  async contains(userAddress) {
    return await this.identityRegistryService.contains(userAddress);
  }

  async isVerified(userAddress) {
    return await this.identityRegistryService.isVerified(userAddress);
  }

  async identity(userAddress) {
    return await this.identityRegistryService.identity(userAddress);
  }

  async getRegistryUsers() {
    return await this.identityRegistryService.getRegistryUsers();
  }

  async isRegistryUser(registryUser) {
    return await this.identityRegistryService.isRegistryUser(registryUser);
  }

  async getClaims(registryUser) {
    return await this.identityRegistryService.getClaims(registryUser);
  }

  async getClaim(registryUser, claimTopic) {
    return this.identityRegistryService && (await this.identityRegistryService.getClaim(registryUser, claimTopic));
  }

  async hasClaim(registryUser, claimTopic) {
    return await this.identityRegistryService.hasClaim(registryUser, claimTopic);
  }

  async addTrustedIssuer(trustedIssuer, claimTopics) {
    const contract = this.trustedIssuersRegistryService.connect(this.signer);
    const tx = await contract.addTrustedIssuer(trustedIssuer, claimTopics);
    await tx.wait();
    return tx;
  }

  async updateTrustedIssuer(data) {
    if (!data || !data.issuer) {
      console.warn("🚨 Invalid data provided, skipping update.");
      return null;
    }

    // ✅ Normalize issuer address to lowercase
    const normalizedIssuer = data.issuer.toLowerCase();

    console.log(`🔄 Starting updateTrustedIssuer for issuer: ${normalizedIssuer}`, data);

    for (let attempt = 1; attempt <= 10; attempt++) {
      console.log(`🔍 Attempt ${attempt}: Checking if TrustedIssuer exists via ParseClient...`);

      try {
        // ✅ Query using the lowercase version
        const existingIssuer = await ParseClient.getRecord("TrustedIssuer", ["issuer"], [normalizedIssuer]);

        if (!existingIssuer) {
          console.warn(`⚠️ Attempt ${attempt}: TrustedIssuer '${normalizedIssuer}' not found yet.`);

          if (attempt < 10) {
            const waitTime = attempt * 2000; // Exponential backoff: 2s, 4s, 6s...
            console.log(`⏳ Waiting ${waitTime / 1000}s before retrying...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue; // Retry
          } else {
            console.error(`❌ Giving up after ${attempt} attempts: TrustedIssuer '${normalizedIssuer}' never appeared.`);
            return null;
          }
        }

        console.log(`✅ TrustedIssuer found on attempt ${attempt}, proceeding with update...`);
        console.log("🔹 Existing TrustedIssuer Data:", existingIssuer);

        // ✅ Ensure the stored issuer address is also in lowercase
        const updateData = { ...data, issuer: normalizedIssuer };

        // ✅ Update using ParseClient
        console.log(`🚀 Attempting update with data:`, updateData);
        const result = await ParseClient.updateExistingRecord("TrustedIssuer", ["issuer"], [normalizedIssuer], updateData);

        console.log(`🎉 Update successful for issuer '${normalizedIssuer}':`, result);
        return result; // Return success
      } catch (error) {
        console.error(`❌ Error on attempt ${attempt}:`, error);

        const waitTime = Math.min(attempt * 2000, 10000); // Cap wait time at 10s
        console.log(`⏳ Retrying in ${waitTime / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    console.error(`❌ Update failed after 10 attempts for issuer '${normalizedIssuer}'.`);
    return null; // Return null if all attempts fail
  }

  async removeTrustedIssuer(trustedIssuer) {
    const contract = this.trustedIssuersRegistryService.connect(this.signer);
    const tx = await contract.removeTrustedIssuer(trustedIssuer);
    await tx.wait();
    return tx;
  }

  async updateIssuerClaimTopics(trustedIssuer, claimTopics) {
    const contract = this.trustedIssuersRegistryService.connect(this.signer);
    const tx = await contract.updateIssuerClaimTopics(trustedIssuer, claimTopics);
    await tx.wait();
    return tx;
  }

  async getTrustedIssuers() {
    const trustedIssuer = await ParseClient.getRecords("TrustedIssuer", ["active"], [true], ["*"]);
    return trustedIssuer;
  }

  //temporary fix: the idea is to update this service (and App) to use dedicated provider for getters
  async isTrustedIssuer(issuer) {
    if (!this.contractAddress) {
      console.error("contractAddress is undefined in isTrustedIssuer");
      throw new Error("Missing contract address for trusted issuer check");
    }

    if (!this.trustedIssuersRegistryAbi) {
      console.error("trustedIssuersRegistryAbi is undefined");
      throw new Error("Missing ABI for trusted issuer contract");
    }

    if (!this.dedicatedProvider) {
      console.error("dedicatedProvider is undefined");
      throw new Error("Missing dedicated provider for read-only contract call");
    }

    try {
      const contract = new ethers.Contract(this.contractAddress, this.trustedIssuersRegistryAbi, this.dedicatedProvider);
      const result = await contract.isTrustedIssuer(issuer);
      console.log("isTrustedIssuer result:", result);
      return result;
    } catch (err) {
      console.error("Error calling isTrustedIssuer:", err);
      throw err;
    }
  }

  async getTrustedIssuerClaimTopics(trustedIssuer) {
    return await this.trustedIssuersRegistryService.getTrustedIssuerClaimTopics(trustedIssuer);
  }

  async hasClaimTopic(issuer, claimTopic) {
    return await this.trustedIssuersRegistryService.hasClaimTopic(issuer, claimTopic);
  }

  async getTokenProjects() {
    try {
      const TokenProject = Parse.Object.extend("TokenProject");
      const query = new Parse.Query(TokenProject);

      // Add any filters you need
      // query.equalTo("status", "active");

      // Sort by creation date (newest first)
      query.descending("createdAt");

      // Limit results if needed
      query.limit(100);

      const results = await query.find();

      return results.map((project) => ({
        id: project.id,
        title: project.get("title"),
        description: project.get("description"),
        // Add other fields
        tradeDeadId: project.get("tradeDeadId"),
        interestRate: project.get("interestRate"),
        industryTemplate: project.get("industryTemplate"),
        logo: project.get("logo"),
        updatedAt: project.get("updatedAt"),
        createdAt: project.get("createdAt"),
        fields: project.get("fields"),
        projectInfo: project.get("projectInfo"),
      }));
    } catch (error) {
      console.error("Error fetching token projects:", error);
      throw error;
    }
  }
}

export default BlockchainService;
