import Parse from "parse";

interface TokenRefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

interface ParseError extends Error {
  code?: number;
  message: string;
}

class ParseJWTClient {
  private initialized: boolean = false;
  private jwtToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private refreshEndpoint: string = "/auth/refresh-cognito-token";
  private originalRestController: any = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const appId = process.env.REACT_APP_PARSE_APPLICATION_ID;
    const jsKey = process.env.REACT_APP_PARSE_JAVASCRIPT_KEY;
    const serverURL = process.env.REACT_APP_PARSE_SERVER_URL;

    if (!appId || !jsKey || !serverURL) {
      console.error("ParseClient initialization failed: Missing environment variables");
      return;
    }

    // Initialize Parse normally
    Parse.initialize(appId, jsKey);
    Parse.serverURL = `${serverURL}/parse`;

    // Load existing tokens
    this.loadTokens();

    // Set up clean JWT interceptor
    this.setupJWTInterceptor();

    // Update global headers with any loaded JWT token
    this.updateGlobalHeaders();

    // Initialize Parse User session if sessionToken exists
    this.initParseUserSession();

    this.initialized = true;
  }

  private async initParseUserSession(): Promise<void> {
    const sessionToken = localStorage.getItem("sessionToken");
    if (sessionToken) {
      try {
        await Parse.User.become(sessionToken);
      } catch (error) {
        const parseError = error as ParseError;
        console.error("Invalid session token:", parseError.message);
        localStorage.removeItem("sessionToken");

        if (parseError.code === 209 || parseError.code === 101) {
          this.clearTokens();
        }
      }
    }
  }

  private setupJWTInterceptor(): void {
    try {
      const coreManager = Parse.CoreManager as any;
      const restController = coreManager.getRESTController();

      // Store original method once
      if (!this.originalRestController) {
        this.originalRestController = restController.request.bind(restController);
      }

      const self = this;

      // Clean override of request method for error handling only
      restController.request = async (method: string, path: string, data: any, options: any = {}) => {
        try {
          return await self.originalRestController(method, path, data, options);
        } catch (error) {
          const parseError = error as ParseError;

          // Handle token expiration
          if (self.isTokenExpiredError(parseError)) {
            try {
              await self.refreshJWTToken();
              // Token refresh will automatically update global headers
              return await self.originalRestController(method, path, data, options);
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              self.clearTokens();
              self.onRefreshFailed(refreshError as Error);
              throw refreshError;
            }
          }

          throw error;
        }
      };
    } catch (error) {
      console.error("Failed to setup JWT interceptor:", error);
    }
  }

  private updateGlobalHeaders(): void {
    try {
      const coreManager = Parse.CoreManager as any;

      if (this.jwtToken) {
        // Set global headers that will be sent with every Parse request
        const currentHeaders = coreManager.get("REQUEST_HEADERS") || {};
        coreManager.set("REQUEST_HEADERS", {
          ...currentHeaders,
          Authorization: `Bearer ${this.jwtToken}`,
        });
      } else {
        // Remove JWT from global headers
        const currentHeaders = coreManager.get("REQUEST_HEADERS") || {};
        const { Authorization, ...headersWithoutAuth } = currentHeaders;
        coreManager.set("REQUEST_HEADERS", headersWithoutAuth);
      }
    } catch (error) {
      console.error("Failed to update global headers:", error);
    }
  }

  private isTokenExpiredError(error: any): boolean {
    return (
      error.code === 209 ||
      error.code === 401 ||
      (error.message &&
        (error.message.toLowerCase().includes("unauthorized") ||
          error.message.toLowerCase().includes("token expired") ||
          error.message.toLowerCase().includes("invalid token")))
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
      return await this.refreshPromise;
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
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data: TokenRefreshResponse = await response.json();

      if (!data.accessToken) {
        throw new Error("No access token in refresh response");
      }

      this.setJWTToken(data.accessToken);

      if (data.refreshToken) {
        this.setRefreshToken(data.refreshToken);
      }
      return data.accessToken;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  }

  private loadTokens(): void {
    this.jwtToken = localStorage.getItem("jwt_token");
    this.refreshToken = localStorage.getItem("refresh_token");

    if (this.jwtToken) console.log("JWT token loaded from storage");
    if (this.refreshToken) console.log("Refresh token loaded from storage");
  }

  // Public methods
  public setJWTToken(token: string): void {
    this.jwtToken = token;
    if (token) {
      localStorage.setItem("jwt_token", token);
    }
    // Update global Parse headers whenever token changes
    this.updateGlobalHeaders();
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

    if (sessionToken) {
      this.setSessionToken(sessionToken);
    }
  }

  public setSessionToken(sessionToken: string): void {
    if (sessionToken) {
      localStorage.setItem("sessionToken", sessionToken);
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
    localStorage.removeItem("sessionToken");

    if (Parse.User.current()) {
      Parse.User.logOut();
    }

    // Clear JWT from global headers
    this.updateGlobalHeaders();

    console.log("✅ All tokens cleared");
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

  public isUserAuthenticated(): boolean {
    return !!Parse.User.current() && (this.hasJWTToken() || !!this.getSessionToken());
  }

  public isTokenExpired(token: string = this.jwtToken || ""): boolean {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

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
    console.warn("JWT token expired - redirecting to login");
    window.location.href = "/login";
  }

  public onRefreshFailed(error: Error): void {
    console.error("Token refresh failed:", error);
    this.onJWTExpired();
  }

  public setRefreshEndpoint(endpoint: string): void {
    this.refreshEndpoint = endpoint;
  }

  public get isInitialized(): boolean {
    return this.initialized;
  }

  // Utility methods
  public async testConnection(): Promise<boolean> {
    try {
      const TestObject = Parse.Object.extend("_User");
      const query = new Parse.Query(TestObject);
      query.limit(1);

      await query.find();
      console.log("Parse connection test successful");
      return true;
    } catch (error) {
      console.log("Parse connection test failed:", error);
      return false;
    }
  }
}

// Create singleton instance
const parseJWTClient = new ParseJWTClient();

// Legacy initialization function for backward compatibility
const parseInitialize = (): ParseJWTClient => {
  return parseJWTClient;
};

export default parseInitialize;
export { parseJWTClient, ParseJWTClient };
