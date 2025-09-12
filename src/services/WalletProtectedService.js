import { BlockchainServiceManager } from '@nomyx/shared';

/**
 * WalletProtectedService - Wrapper that ensures wallet is connected before blockchain operations
 * 
 * This service acts as a proxy for all blockchain operations, checking wallet connection
 * status before allowing any blockchain transaction to proceed. If wallet is not connected,
 * it triggers a modal prompt for the user to connect their wallet.
 */
class WalletProtectedService {
  constructor(blockchainService, onWalletRequired) {
    this.blockchainService = blockchainService;
    this.onWalletRequired = onWalletRequired; // Callback to show wallet connection modal
    this.manager = BlockchainServiceManager.getInstance();
    
    // List of methods that require wallet connection
    this.protectedMethods = [
      'createIdentity',
      'addIdentity',
      'removeIdentity',
      'unregisterIdentity',
      'addIdentityToRegistry',
      'removeIdentityFromRegistry',
      'addClaimTopic',
      'removeClaimTopic',
      'addClaimTopicsToIdentity',
      'setClaims',
      'removeClaim',
      'addTrustedIssuer',
      'removeTrustedIssuer',
      'updateTrustedIssuerClaimTopics',
      'mintNFT',
      'transferNFT',
      'createTradeDeal',
      'fundTradeDeal',
      'withdrawTradeDealFunding',
      'repayTradeDeal',
      'listMarketplaceItem',
      'purchaseMarketplaceItem',
      'initializeCarbonCredit',
      'retireCarbonCredits'
    ];
    
    // Create proxy methods for all protected operations
    this.protectedMethods.forEach(method => {
      if (this.blockchainService && typeof this.blockchainService[method] === 'function') {
        console.log(`[WalletProtectedService] Protecting method: ${method}`);
        this[method] = this.createProtectedMethod(method);
      }
    });
    
    // Pass through all other methods without protection
    this.proxyUnprotectedMethods();
  }
  
  /**
   * Create a protected version of a blockchain method
   */
  createProtectedMethod(methodName) {
    return async (...args) => {
      console.log(`[WalletProtectedService] Method called: ${methodName}`);
      console.log(`[WalletProtectedService] Wallet connected: ${this.manager.isWalletConnected()}`);
      
      // Check if wallet is connected
      if (!this.manager.isWalletConnected()) {
        console.log(`[WalletProtectedService] Wallet required for ${methodName}`);
        console.log(`[WalletProtectedService] onWalletRequired callback available: ${!!this.onWalletRequired}`);
        
        // Trigger wallet connection modal
        if (this.onWalletRequired) {
          console.log(`[WalletProtectedService] Calling onWalletRequired callback`);
          const connected = await this.onWalletRequired();
          console.log(`[WalletProtectedService] Wallet connection result: ${connected}`);
          if (!connected) {
            throw new Error('Wallet connection required for this operation');
          }
        } else {
          console.log(`[WalletProtectedService] No onWalletRequired callback, throwing error`);
          throw new Error('Please connect your wallet first');
        }
      }
      
      // Proceed with the original method
      console.log(`[WalletProtectedService] Executing ${methodName} with wallet connected`);
      return this.blockchainService[methodName](...args);
    };
  }
  
  /**
   * Proxy all unprotected methods directly
   */
  proxyUnprotectedMethods() {
    // Get all methods from blockchain service prototype if it exists
    if (this.blockchainService && Object.getPrototypeOf(this.blockchainService)) {
      const allMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.blockchainService))
        .filter(name => {
          return name !== 'constructor' && 
                 typeof this.blockchainService[name] === 'function' &&
                 !this.protectedMethods.includes(name) &&
                 !this[name]; // Don't override if already defined
        });
      
      // Create direct proxy for unprotected methods
      allMethods.forEach(method => {
        this[method] = (...args) => this.blockchainService[method](...args);
      });
    }
    
    // Also proxy any direct properties
    const properties = Object.keys(this.blockchainService)
      .filter(key => typeof this.blockchainService[key] !== 'function');
    
    properties.forEach(prop => {
      Object.defineProperty(this, prop, {
        get: () => this.blockchainService[prop],
        set: (value) => { this.blockchainService[prop] = value; }
      });
    });
  }
  
  /**
   * Get the underlying blockchain service (for advanced use)
   */
  getUnderlyingService() {
    return this.blockchainService;
  }
  
  /**
   * Check if wallet is currently connected
   */
  isWalletConnected() {
    return this.manager.isWalletConnected();
  }
  
  /**
   * Get current wallet info
   */
  getWalletInfo() {
    return this.manager.getWalletInfo();
  }
}

export default WalletProtectedService;