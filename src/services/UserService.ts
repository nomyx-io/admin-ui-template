import ParseClient from "../services/ParseClient";

class UserService {
  /**
   * Fetch a single ClaimTopic by its on-chain topic id.
   *
   * @param {number|string} topic - The topic id (will be coerced to string for query)
   * @returns {Promise<Parse.Object|null>}
   */
  async getClaimTopicByTopic(topic: string | any) {
    try {
      if (topic === null || topic === undefined || topic === "") {
        console.warn("getClaimTopicByTopic called with empty topic");
        return null;
      }

      const records = await ParseClient.getRecords("ClaimTopic", ["topic"], [String(topic)], ["*"]);

      return records && records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error(`Error fetching ClaimTopic with topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Fetch a single TrustedIssuer by its issuer wallet address.
   * Normalizes the address to lowercase to match the storage convention used
   * elsewhere in the codebase (e.g., walletAddr.toLowerCase() in CreateDigitalId).
   *
   * @param {string} walletAddress
   * @returns {Promise<Parse.Object|null>}
   */
  async getTrustedIssuerByAddress(walletAddress: string | any) {
    try {
      if (!walletAddress || typeof walletAddress !== "string") {
        console.warn("getTrustedIssuerByAddress called with invalid wallet address");
        return null;
      }

      const normalizedAddress = walletAddress.toLowerCase();

      const records = await ParseClient.getRecords("TrustedIssuer", ["issuer"], [normalizedAddress], ["*"]);

      return records && records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error(`Error fetching TrustedIssuer with address ${walletAddress}:`, error);
      throw error;
    }
  }
}

// Export as a singleton instance to match the existing DfnsService pattern
export default new UserService();
