import Parse from "parse";

interface TokenRefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

interface RequestOptions {
  requestHeaders?: Record<string, string>;
  [key: string]: any;
}

interface ParseError extends Error {
  code?: number;
  message: string;
}

interface RESTController {
  request: (method: string, path: string, data: any, options?: RequestOptions) => Promise<any>;
}

// Extend Parse CoreManager type to include missing methods
declare module "parse" {
  namespace CoreManager {
    function getRESTController(): RESTController;
  }
}

class ParseJWTClient {
  private initialized: boolean = false;
  private jwtToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private refreshEndpoint: string = "/auth/refresh";

  constructor() {
    this.init();
  }

  private init(): void {
    const appId = process.env.REACT_APP_PARSE_APPLICATION_ID;
    const jsKey = process.env.REACT_APP_PARSE_JAVASCRIPT_KEY;
    const serverURL = process.env.REACT_APP_PARSE_SERVER_URL;

    if (!appId || !jsKey || !serverURL) {
      console.error("ParseClient initialization failed: Missing environment variables.");
      return;
    }

    Parse.initialize(appId, jsKey);
    Parse.serverURL = `${serverURL}/parse`;

    // Override the default RESTController to add JWT token
    this.setupJWTInterceptor();

    // Load existing JWT and refresh tokens
    this.loadTokens();

    // Initialize Parse User session if sessionToken exists
    this.initParseUserSession();

    this.initialized = true;
  }

  private async initParseUserSession(): Promise<void> {
    const sessionToken = localStorage.getItem("sessionToken");
    if (sessionToken) {
      try {
        await Parse.User.become(sessionToken);
        console.log("Parse User session restored successfully");
      } catch (error) {
        const parseError = error as ParseError;
        console.error("Error becoming user with sessionToken:", parseError);
        // Clear invalid session token
        localStorage.removeItem("sessionToken");

        // If session token is invalid, also clear JWT tokens as they might be related
        if (parseError.code === 209 || parseError.code === 101) {
          this.clearTokens();
        }
      }
    }
  }

  private setupJWTInterceptor(): void {
    try {
      // Type assertion to handle missing type definitions
      const coreManager = Parse.CoreManager as any;
      const originalRequest = coreManager.getRESTController().request;

      coreManager.getRESTController().request = async (method: string, path: string, data: any, options: RequestOptions = {}): Promise<any> => {
        // Add JWT token to all requests
        if (this.jwtToken) {
          options.requestHeaders = {
            ...options.requestHeaders,
            Authorization: `Bearer ${this.jwtToken}`,
            "X-JWT-Token": this.jwtToken,
          };
        }

        try {
          // Call original request method
          return await originalRequest.call(coreManager.getRESTController(), method, path, data, options);
        } catch (error) {
          const parseError = error as ParseError;
          // Handle JWT expiration
          if (this.isTokenExpiredError(parseError)) {
            console.log("JWT token expired, attempting refresh...");

            try {
              // Attempt to refresh the token
              await this.refreshJWTToken();

              // Retry the original request with new token
              if (this.jwtToken) {
                options.requestHeaders = {
                  ...options.requestHeaders,
                  Authorization: `Bearer ${this.jwtToken}`,
                  "X-JWT-Token": this.jwtToken,
                };
                return await originalRequest.call(coreManager.getRESTController(), method, path, data, options);
              }
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              this.clearTokens();
              this.onRefreshFailed(refreshError as Error);
              throw refreshError;
            }
          }
          throw error;
        }
      };
    } catch (error) {
      console.error("Failed to setup JWT interceptor:", error);
      console.warn("JWT interceptor not available - falling back to manual token management");
    }
  }

  private isTokenExpiredError(error: any): boolean {
    return (
      error.code === 209 ||
      error.code === 401 ||
      (error.message && error.message.toLowerCase().includes("unauthorized")) ||
      (error.message && error.message.toLowerCase().includes("token expired")) ||
      (error.message && error.message.toLowerCase().includes("invalid token"))
    );
  }

  private async refreshJWTToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    try {
      const serverURL = process.env.REACT_APP_PARSE_SERVER_URL;
      const response = await fetch(`${serverURL}${this.refreshEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.refreshToken}`,
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const data: TokenRefreshResponse = await response.json();

      if (data.accessToken) {
        this.setJWTToken(data.accessToken);

        // Update refresh token if provided
        if (data.refreshToken) {
          this.setRefreshToken(data.refreshToken);
        }

        console.log("JWT token refreshed successfully");
        return data.accessToken;
      } else {
        throw new Error("No access token in refresh response");
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  }

  private loadTokens(): void {
    const accessToken = localStorage.getItem("jwt_token") || sessionStorage.getItem("jwt_token");
    const refreshToken = localStorage.getItem("refresh_token") || sessionStorage.getItem("refresh_token");

    if (accessToken) {
      this.setJWTToken(accessToken);
    }

    if (refreshToken) {
      this.setRefreshToken(refreshToken);
    }
  }

  public setJWTToken(token: string): void {
    this.jwtToken = token;
    if (token) {
      localStorage.setItem("jwt_token", token);
    }
  }

  public setRefreshToken(token: string): void {
    this.refreshToken = token;
    if (token) {
      localStorage.setItem("refresh_token", token);
    }
  }

  public setTokens(accessToken: string, refreshToken: string, sessionToken?: string): void {
    this.setJWTToken(accessToken);
    this.setRefreshToken(refreshToken);

    // Set Parse User session token if provided
    if (sessionToken) {
      this.setSessionToken(sessionToken);
    }
  }

  public setSessionToken(sessionToken: string): void {
    if (sessionToken) {
      localStorage.setItem("sessionToken", sessionToken);
      // Automatically become the user with this session token
      Parse.User.become(sessionToken).catch((error: ParseError) => {
        console.error("Error setting Parse User session:", error);
        localStorage.removeItem("sessionToken");
      });
    }
  }

  public clearTokens(): void {
    this.jwtToken = null;
    this.refreshToken = null;
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("sessionToken"); // Also clear Parse session token
    // Clear Parse User session
    if (Parse.User.current()) {
      Parse.User.logOut();
    }
  }

  // Legacy method for backward compatibility
  public clearJWTToken(): void {
    this.clearTokens();
  }

  public getJWTToken(): string | null {
    return this.jwtToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  public hasJWTToken(): boolean {
    return !!this.jwtToken;
  }

  public hasRefreshToken(): boolean {
    return !!this.refreshToken;
  }

  public hasValidTokens(): boolean {
    return this.hasJWTToken() && this.hasRefreshToken();
  }

  public getSessionToken(): string | null {
    return localStorage.getItem("sessionToken");
  }

  public hasSessionToken(): boolean {
    return !!this.getSessionToken();
  }

  public isUserAuthenticated(): boolean {
    return !!Parse.User.current() && (this.hasJWTToken() || this.hasSessionToken());
  }

  // Check if token is expired based on JWT payload (optional)
  public isTokenExpired(token: string = this.jwtToken || ""): boolean {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      console.warn("Could not decode JWT token:", error);
      return true;
    }
  }

  // Proactively refresh token if it's about to expire (within 5 minutes)
  public async checkAndRefreshToken(): Promise<boolean> {
    if (!this.jwtToken || !this.refreshToken) {
      return false;
    }

    try {
      const payload = JSON.parse(atob(this.jwtToken.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const fiveMinutesFromNow = currentTime + 5 * 60;

      if (payload.exp < fiveMinutesFromNow) {
        console.log("Token expires soon, refreshing...");
        await this.refreshJWTToken();
        return true;
      }
    } catch (error) {
      console.warn("Could not check token expiration:", error);
    }

    return false;
  }

  public onJWTExpired(): void {
    console.warn("JWT token expired");
    // redirect to login
    window.location.href = "/login";
  }

  public onRefreshFailed(error: Error): void {
    // Override this method to handle refresh failure
    console.error("Token refresh failed:", error);
    this.onJWTExpired();
  }

  // Configure custom refresh endpoint
  public setRefreshEndpoint(endpoint: string): void {
    this.refreshEndpoint = endpoint;
  }

  public get isInitialized(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
const parseJWTClient = new ParseJWTClient();

// Legacy initialization function for backward compatibility
const parseInitialize = (): ParseJWTClient => {
  if (!parseJWTClient.isInitialized) {
    parseJWTClient["init"]();
  }
  return parseJWTClient;
};

export default parseInitialize;
export { parseJWTClient, ParseJWTClient };
