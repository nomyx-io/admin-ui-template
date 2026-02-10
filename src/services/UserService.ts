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

  getUserWallets = async (userId: string) => {
    try {
      const result = await Parse.Cloud.run("getUserWallets", { userId });
      return result.wallets;
    } catch (error) {
      console.error("Error getting user wallets:", error);
      throw error;
    }
  };

  fetchAndStoreSecondaryWallet = async (userId: string) => {
    try {
      const result = await Parse.Cloud.run("fetchAndStoreSecondaryWallet", { userId });
      return result;
    } catch (error) {
      console.error("Error fetching secondary wallet:", error);
      throw error;
    }
  };

  saveUserWallet = async (userId: string, walletData: any) => {
    try {
      const result = await Parse.Cloud.run("saveUserWallet", {
        userId,
        ...walletData,
      });
      return result;
    } catch (error) {
      console.error("Error saving wallet:", error);
      throw error;
    }
  };

  deleteUserWallet = async (walletId: string) => {
    try {
      const result = await Parse.Cloud.run("deleteUserWallet", { walletId });
      return result;
    } catch (error) {
      console.error("Error deleting wallet:", error);
      throw error;
    }
  };
}

export default UserService.instance;
