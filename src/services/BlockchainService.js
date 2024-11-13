import { ethers } from "ethers";
import PubSub from "pubsub-js";

import ParseClient from "./ParseClient.ts";
import * as ClaimTopicsRegistry from "../abi/IClaimTopicsRegistry.json";
import * as IdentityFactory from "../abi/IdentityFactory.json";
import * as IdentityRegistry from "../abi/IIdentityRegistry.json";
import * as MinterFacet from "../abi/IMinterFacet.json";
import * as TrustedIssuersRegistry from "../abi/ITrustedIssuersRegistry.json";
import { NomyxEvent } from "../utils/Constants";

class BlockchainService {
  claimTopicsAbi = ClaimTopicsRegistry.default.abi;
  identityRegistryAbi = IdentityRegistry.default.abi;
  trustedIssuersRegistryAbi = TrustedIssuersRegistry.default.abi;
  identityFactoryAbi = IdentityFactory.default.abi;
  mintAbi = MinterFacet.default.abi;

  parseClient = ParseClient;

  constructor(provider, contractAddress, identityRegistryAddress) {
    // this.provider = new ethers.providers.JsonRpcProvider(provider);
    this.provider = provider;
    this.signer = this.provider.getSigner();

    this.claimTopicRegistryService = new ethers.Contract(contractAddress, this.claimTopicsAbi, this.provider);
    this.identityRegistryService = new ethers.Contract(contractAddress, this.identityRegistryAbi, this.provider);
    this.trustedIssuersRegistryService = new ethers.Contract(contractAddress, this.trustedIssuersRegistryAbi, this.provider);
    this.identityFactoryService = new ethers.Contract(identityRegistryAddress, this.identityFactoryAbi, this.provider);
    this.mintService = new ethers.Contract(contractAddress, this.mintAbi, this.provider);

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

    this.parseClient.initialize();

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
    const tx = await contractWithSigner.llMint(metaData);
    return await tx.wait();
  }

  async addClaimTopic(claimTopic) {
    const contractWithSigner = this.claimTopicRegistryService.connect(this.signer);
    const tx = await contractWithSigner.addClaimTopic(claimTopic);
    return await tx.wait();
  }

  updateClaimTopic(claimTopic) {
    return this.parseClient.updateExistingRecord("ClaimTopic", ["topic"], [claimTopic.topic], claimTopic);
  }

  async removeClaimTopic(claimTopic) {
    const contractWithSigner = this.claimTopicRegistryService.connect(this.signer);
    const tx = await contractWithSigner.removeClaimTopic(claimTopic);
    await tx.wait();
    return tx;
  }

  async getClaimTopics() {
    return await this.parseClient.getRecords("ClaimTopic", [], [], ["*"]);
  }

  async getNextClaimTopicId() {
    const result = await this.parseClient.getRecords("ClaimTopic", [], [], ["topic"], 1, 0, "topic", "desc");
    let highestTopicId = result.length > 0 ? Number.parseInt(result[0].attributes.topic) + 1 : 1;
    return highestTopicId;
  }

  async getClaimTopicById(id) {
    const claimTopic = await this.parseClient.getRecords("ClaimTopic", ["objectId"], [id], ["*"]);
    return claimTopic;
  }

  async getTrustedIssuersForClaimTopics(id) {
    const trustedIssuer = await this.parseClient.getRecords("TrustedIssuer", ["claimTopics.topic"], [id]);
    return trustedIssuer;
  }

  async getTrustedIssuersByObjectId(id) {
    const results = await this.parseClient.getRecords("TrustedIssuer", ["objectId"], [id]);

    let trustedIssuer = null;

    if (results.length > 0) {
      trustedIssuer = results[0];
    }

    return trustedIssuer;
  }

  async getClaimsForClaimTopics(id) {
    const pointerObject = {
      __type: "Pointer",
      className: "ClaimTopic",
      objectId: id,
    };

    const claimTopics = await this.parseClient.getRecords("Claim", ["claimTopicObj"], [pointerObject], ["*"]);
    const claimTopicObj = await this.parseClient.getRecords("ClaimTopic", ["objectId"], [id]);
    if (claimTopicObj.length === 0) return []; // Return if no matching topic

    const claimTopicValue = claimTopicObj[0].attributes.topic;

    // Fetch identities that contain the claim topic in their claims array
    const identities = await this.parseClient.getRecords("Identity", ["claims"], [claimTopicValue]);

    // Filter claim topics to include only those that match with identities
    const filteredClaims = claimTopics.filter((claim) =>
      identities.some((identity) => identity?.attributes.identity === claim?.attributes?.identity)
    );

    return filteredClaims;
  }

  async getActiveIdentities() {
    try {
      // Fetch all active identities
      const identities = await this.parseClient.getRecords("Identity", ["active"], [true], ["*"]);

      if (identities && identities.length > 0) {
        // Fetch active claims and include the related identityObj and claimTopicObj
        const claims = await this.parseClient.getRecords("Claim", ["active"], [true], ["identityObj", "claimTopicObj"]);

        if (claims && claims.length > 0) {
          for (let i = 0; i < identities.length; i++) {
            const identity = identities[i];

            // Filter and map claims to the corresponding identity, with a check for valid identityObj
            const activeClaims = claims.filter((claim) => {
              const identityObj = claim.get("identityObj");
              return identityObj && identityObj.id === identity.id; // Check if identityObj exists and matches
            });

            if (activeClaims.length > 0) {
              // Ensure the claims object exists on the identity
              if (!identity.attributes.claims) {
                identity.attributes.claims = { children: [] }; // Initialize claims object if it doesn't exist
              }

              // Assign active claims to children
              identity.attributes.claims.children = activeClaims;

              // Sort the claims by topic
              identity.attributes.claims.children.sort((a, b) => {
                const topicA = a.attributes.claimTopicObj?.attributes?.topic || "";
                const topicB = b.attributes.claimTopicObj?.attributes?.topic || "";
                return topicA > topicB ? 1 : -1;
              });
            }
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
    const users = await this.parseClient.getRecords("_User", ["pendingApproval", "denied"], [true, false], ["*"]);
    return users;
  }

  async getAddClaimIdentities() {
    const identities = await this.parseClient.getRecords("Identity", ["active"], [true], ["*"]);
    if (identities && identities.length > 0) {
      const claims = await this.parseClient.getRecords("Claim", ["active"], [true], ["identityObj", "claimTopicObj"]);

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
    return await this.parseClient.updateExistingRecord("_User", ["walletAddress"], [identityAddress], { denied: true });
  }

  async createIdentity(identity) {
    const contract = this.identityFactoryService.connect(this.signer);
    const tx = await contract.createIdentity(identity);
    await tx.wait();
    return tx;
  }

  async getIdentity(address) {
    const contract = this.identityFactoryService.connect(this.signer);
    const tx = await contract.getIdentity(address);
    return tx;
  }

  async updateIdentity(identity, identityData) {
    // Check if identityData is null
    if (!identityData) {
      //No identity data provided, skipping update.
      return null;
    }

    // Function to perform the update
    const performUpdate = async () => {
      try {
        const result = await this.parseClient.updateExistingRecord("Identity", ["address"], [identity], identityData);
        return result; // Return the result if successful
      } catch (error) {
        console.error("Update failed:", error);
        return null; // Return null if the update fails
      }
    };

    // Polling logic: Try up to 3 times with a 4-second delay between each attempt
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await performUpdate();

      if (result) {
        //Update successful
        return result; // Return the result if successful
      }

      // If not the last attempt, wait for 4 seconds before trying again
      if (attempt < 3) {
        //Waiting 4 seconds before next attempt...
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    }
    //Update failed after 3 attempts.
    return null; // Return null if all attempts fail
  }

  async createParseIdentity(identity, identityData) {
    return await this.parseClient.createRecord("_User", ["address"], [identity], identityData);
  }

  async isUser(identityAddress) {
    const user = await this.parseClient.getRecord("_User", ["walletAddress"], [identityAddress]);
    return user ? true : false;
  }

  async approveUser(identityAddress) {
    return await this.parseClient.updateExistingRecord("_User", ["walletAddress"], [identityAddress], { pendingApproval: false });
  }

  async addIdentity(identity, identityData) {
    const contract = this.identityRegistryService.connect(this.signer);
    const tx = await contract.addIdentity(identity, identityData);
    await tx.wait();
    return tx;
  }

  async getDigitalIdentity(id) {
    // Fetch the identity record based on the given ID
    const identities = await this.parseClient.getRecords("Identity", ["objectId"], [id], ["*"]);
    const claims = await this.parseClient.getRecords("ClaimTopic", undefined, undefined, ["*"]);
    const identity = identities.length > 0 ? identities[0] : null;

    // If no identity is found, return null
    if (!identity) {
      return null;
    }

    const claimAdded = await this.parseClient.getRecords("ClaimAdded__e", ["identity"], [identity.attributes.identity], ["claimTopic", "blockHash"]);

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

  async removeClaim(identity, claimTopic) {
    const contract = this.identityRegistryService.connect(this.signer);
    const tx = await contract.removeClaim(identity, claimTopic);
    await tx.wait();
    return tx;
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
    return await this.parseClient.updateExistingRecord("TrustedIssuer", ["issuer"], [data.issuer], data);
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
    const trustedIssuer = await this.parseClient.getRecords("TrustedIssuer", ["active"], [true], ["*"]);
    return trustedIssuer;
  }

  async isTrustedIssuer(issuer) {
    return await this.trustedIssuersRegistryService.isTrustedIssuer(issuer);
  }

  async getTrustedIssuerClaimTopics(trustedIssuer) {
    return await this.trustedIssuersRegistryService.getTrustedIssuerClaimTopics(trustedIssuer);
  }

  async hasClaimTopic(issuer, claimTopic) {
    return await this.trustedIssuersRegistryService.hasClaimTopic(issuer, claimTopic);
  }
}

export default BlockchainService;
