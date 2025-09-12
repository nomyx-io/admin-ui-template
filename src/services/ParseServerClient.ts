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
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[ParseServerClient] Cloud function ${functionName} completed successfully`);
      return data;
    } catch (error: any) {
      console.error(`[ParseServerClient] Error calling Cloud function ${functionName}:`, error);
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

  async deleteIdentity(walletAddress: string): Promise<any> {
    return this.run('deleteIdentity', { walletAddress });
  }
}

// Export singleton instance
const parseServerClient = new ParseServerClient();
export default parseServerClient;

// Also export the class for testing or custom instances
export { ParseServerClient };