/**
 * ParseServerClient - Client-side wrapper for calling Parse Cloud functions via API routes
 * This avoids the session token authentication issue by using server-side Master Key
 */

interface CloudFunctionOptions {
  params?: any;
  sessionToken?: string;
}

class ParseServerClient {
  private baseUrl: string;
  private sessionToken: string | null = null;

  constructor() {
    // Use relative URL for API routes
    this.baseUrl = '/api/parse';
    
    // Try to get session token from localStorage if available
    if (typeof window !== 'undefined') {
      this.sessionToken = localStorage.getItem('sessionToken');
    }
  }

  /**
   * Set the session token for authenticated requests
   */
  setSessionToken(token: string) {
    this.sessionToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sessionToken', token);
    }
  }

  /**
   * Clear the session token
   */
  clearSessionToken() {
    this.sessionToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sessionToken');
    }
  }

  /**
   * Call a Parse Cloud function via the API route
   */
  async run(functionName: string, params?: any): Promise<any> {
    const token = this.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null);
    
    if (!token) {
      console.warn('[ParseServerClient] No session token available, request may fail');
    }

    const url = `${this.baseUrl}/cloud/${functionName}`;
    
    console.log(`[ParseServerClient] Calling Cloud function: ${functionName}`, params);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(params || {})
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;

        // Check for invalid session token error
        if (response.status === 401 ||
            errorMessage.toLowerCase().includes('invalid session') ||
            errorMessage.toLowerCase().includes('session token')) {
          console.log('[ParseServerClient] Invalid session token detected, logging out user');

          // Clear all session data
          this.clearSessionToken();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('username');
            // Clear any other auth-related items
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('session') || key.includes('auth') || key.includes('token'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Show a message if antd is available
            if ((window as any).antd?.message) {
              (window as any).antd.message.warning('Your session has expired. Redirecting to login...', 2);
            }

            // Redirect to login page after a short delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }

          throw new Error('Session expired. Please login again.');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`[ParseServerClient] Cloud function ${functionName} completed successfully`);
      return data;
    } catch (error: any) {
      console.error(`[ParseServerClient] Error calling Cloud function ${functionName}:`, error);

      // Also check for session errors in the catch block
      if (error.message && (
          error.message.toLowerCase().includes('invalid session') ||
          error.message.toLowerCase().includes('session token'))) {
        console.log('[ParseServerClient] Invalid session token in catch block, logging out user');

        // Clear session and redirect
        this.clearSessionToken();
        if (typeof window !== 'undefined') {
          // Clear all localStorage items
          localStorage.clear();

          // Show a message if antd is available
          if ((window as any).antd?.message) {
            (window as any).antd.message.warning('Your session has expired. Redirecting to login...', 2);
          }

          // Redirect to login page after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        }
      }

      throw error;
    }
  }

  /**
   * Identity-specific Cloud functions
   */
  async getActiveIdentities(chain?: string): Promise<any[]> {
    return this.run('getActiveIdentities', { chain });
  }

  async getPendingIdentities(): Promise<any[]> {
    return this.run('getPendingIdentities');
  }

  async getIdentityById(identityId: string): Promise<any> {
    console.log('[ParseServerClient] getIdentityById called with:', identityId);
    if (!identityId) {
      console.error('[ParseServerClient] getIdentityById called with undefined/null identityId!');
      throw new Error('Identity ID is required');
    }
    return this.run('getIdentityById', { identityId });
  }

  async updateIdentity(walletAddress: string, data: any): Promise<any> {
    return this.run('updateIdentity', { walletAddress, data });
  }

  async storeClaimTopicMetadata(topicId: string, displayName: string): Promise<any> {
    return this.run('storeClaimTopicMetadata', { topicId, displayName });
  }

  async getClaimTopicsWithMetadata(): Promise<any[]> {
    return this.run('getClaimTopicsWithMetadata');
  }

  async getClaimTopicsDetailed(topicId?: string): Promise<any[]> {
    return this.run('getClaimTopicsDetailed', { topicId });
  }

  async deleteIdentity(identityIdOrAddress: string): Promise<any> {
    // The Cloud function expects either an identityId or walletAddress
    // Try to determine which one we have based on format
    // Parse object IDs are typically 10 characters, while Stellar addresses are 56 and start with 'G'
    const isStellarAddress = identityIdOrAddress.length === 56 && identityIdOrAddress.startsWith('G');
    const isObjectId = identityIdOrAddress.length === 10;

    // Prefer identityId if we have what looks like an object ID
    const params = isObjectId
      ? { identityId: identityIdOrAddress }
      : { walletAddress: identityIdOrAddress };

    return this.run('deleteIdentity', params);
  }
}

// Export singleton instance
const parseServerClient = new ParseServerClient();
export default parseServerClient;

// Also export the class for testing or custom instances
export { ParseServerClient };