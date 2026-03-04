import Parse from "parse";

class UserService {
  private static _instance: UserService;

  public static get instance(): UserService {
    if (!UserService._instance) {
      UserService._instance = new UserService();
    }
    return UserService._instance;
  }

  public async getInitialState() {}

  getUserWallets = async (email: string) => {
    try {
      const result = await Parse.Cloud.run("getUserWallets", { email });
      return result.wallets;
    } catch (error) {
      console.error("Error getting user wallets:", error);
      throw error;
    }
  };

  fetchAndStoreSecondaryWallet = async (email: string) => {
    try {
      const result = await Parse.Cloud.run("fetchAndStoreSecondaryWallet", { email });
      return result;
    } catch (error) {
      console.error("Error fetching secondary wallet:", error);
      throw error;
    }
  };

  getIdentityByEmail = async (email: string) => {
    try {
      const response = await Parse.Cloud.run("getIdentityAddressByEmail", { email });
      return response?.identityAddress || null;
    } catch (error: any) {
      console.error(`Failed to get identity by email: ${error.message}`);
      return null;
    }
  };

  saveUserWallet = async (email: string, walletData: any) => {
    try {
      const result = await Parse.Cloud.run("saveUserWallet", {
        email,
        ...walletData,
      });
      return result;
    } catch (error) {
      console.error("Error saving wallet:", error);
      throw error;
    }
  };
}

export default UserService.instance;
