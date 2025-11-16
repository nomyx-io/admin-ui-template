/**
 * ParseServerClient - Client-side wrapper for calling Parse Cloud functions via API routes
 * This avoids the session token authentication issue by using server-side Master Key
 */

import { PortalStorage } from '@nomyx/shared';
import { signOut } from 'next-auth/react';

interface CloudFunctionOptions {
  params?: any;
  sessionToken?: string;
}

class ParseServerClient {
  private baseUrl: string;
  private sessionToken: string | null = null;
  private lastRedirectTime: number = 0;
  private redirectCount: number = 0;
  private readonly REDIRECT_COOLDOWN = 5000; // 5 seconds between redirects
  private readonly MAX_REDIRECTS = 3; // Max redirects before showing error

  constructor() {
    // Use relative URL for API routes
    this.baseUrl = '/api/parse';

    // Try to get session token from PortalStorage if available
    if (typeof window !== 'undefined') {
      this.sessionToken = PortalStorage.getItem('sessionToken');
    }
  }

  /**
   * Set the session token for authenticated requests
   */
  setSessionToken(token: string) {
    this.sessionToken = token;
    if (typeof window !== 'undefined') {
      PortalStorage.setItem('sessionToken', token);
    }
  }

  /**
   * Clear the session token
   */
  clearSessionToken() {
    this.sessionToken = null;
    if (typeof window !== 'undefined') {
      PortalStorage.removeItem('sessionToken');
    }
  }

  /**
   * Call a Parse Cloud function via the API route
   */
  async run(functionName: string, params?: any): Promise<any> {
    const token = this.sessionToken || (typeof window !== 'undefined' ? PortalStorage.getItem('sessionToken') : null);

    console.log('[ParseServerClient] Token check:', {
      hasCachedToken: !!this.sessionToken,
      hasStorageToken: typeof window !== 'undefined' ? !!PortalStorage.getItem('sessionToken') : false,
      finalToken: token ? `${token.substring(0, 10)}...` : 'null',
      storageKeys: typeof window !== 'undefined' ? Object.keys(localStorage).filter(k => k.includes('token') || k.includes('session')) : []
    });

    if (!token) {
      console.warn('[ParseServerClient] No session token available, request may fail');
      console.warn('[ParseServerClient] All PortalStorage keys:', typeof window !== 'undefined' ? Object.keys(localStorage) : []);
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
          console.log('[ParseServerClient] Session token in storage:', typeof window !== 'undefined' && PortalStorage.getItem('sessionToken') ? 'present' : 'missing');

          // Prevent infinite redirect loop
          const now = Date.now();
          if (now - this.lastRedirectTime < this.REDIRECT_COOLDOWN) {
            this.redirectCount++;
            console.error(`[ParseServerClient] Rapid redirect detected (${this.redirectCount}/${this.MAX_REDIRECTS})`);

            if (this.redirectCount >= this.MAX_REDIRECTS) {
              console.error('[ParseServerClient] Max redirects reached, showing error instead of redirecting');
              const errorMsg = 'Authentication error. Please clear your browser cache and try logging in again.';
              if (typeof window !== 'undefined' && (window as any).antd?.message) {
                (window as any).antd.message.error(errorMsg, 0); // 0 = don't auto-close
              }
              throw new Error(errorMsg);
            }
          } else {
            // Reset count if enough time has passed
            this.redirectCount = 1;
          }

          this.lastRedirectTime = now;

          // Automatically sign out from NextAuth to clear the invalid session
          if (typeof window !== 'undefined') {
            console.log('[ParseServerClient] Automatically signing out due to invalid Parse session');

            // Clear all session data
            this.clearSessionToken();
            PortalStorage.removeItem('currentUser');
            PortalStorage.removeItem('sessionToken');
            PortalStorage.removeItem('username');

            // Clear any other auth-related items
            const keysToRemove = [];
            for (let i = 0; i < PortalStorage.length; i++) {
              const key = PortalStorage.key(i);
              if (key && (key.includes('session') || key.includes('auth') || key.includes('token'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => PortalStorage.removeItem(key));

            // Show a message if antd is available
            if ((window as any).antd?.message) {
              (window as any).antd.message.warning('Your session has expired. Logging out...', 2);
            }

            // Sign out from NextAuth to clear the session completely
            // This will remove the NextAuth cookie and create a fresh session on next login
            signOut({ redirect: false }).then(() => {
              console.log('[ParseServerClient] NextAuth sign out complete, redirecting to login');
              window.location.href = '/login';
            }).catch((err) => {
              console.error('[ParseServerClient] Error during signOut:', err);
              // Redirect anyway
              window.location.href = '/login';
            });
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
          error.message.toLowerCase().includes('session token')) &&
          !error.message.includes('Authentication error')) { // Don't re-process our own error
        console.log('[ParseServerClient] Invalid session token in catch block, logging out user');

        // Use same rate limiting as above
        const now = Date.now();
        if (now - this.lastRedirectTime < this.REDIRECT_COOLDOWN) {
          this.redirectCount++;
          if (this.redirectCount >= this.MAX_REDIRECTS) {
            console.error('[ParseServerClient] Max redirects reached in catch block');
            throw error; // Re-throw without redirecting
          }
        } else {
          this.redirectCount = 1;
        }

        this.lastRedirectTime = now;

        // Clear session and redirect
        this.clearSessionToken();
        if (typeof window !== 'undefined') {
          console.log('[ParseServerClient] Automatically signing out in catch block due to invalid session');

          // Clear all PortalStorage items
          PortalStorage.clear();

          // Show a message if antd is available
          if ((window as any).antd?.message) {
            (window as any).antd.message.warning('Your session has expired. Logging out...', 2);
          }

          // Sign out from NextAuth
          signOut({ redirect: false }).then(() => {
            console.log('[ParseServerClient] NextAuth sign out complete (catch block), redirecting to login');
            window.location.href = '/login';
          }).catch((err) => {
            console.error('[ParseServerClient] Error during signOut (catch block):', err);
            window.location.href = '/login';
          });
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