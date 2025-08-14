import Parse from "parse";

// Initialize Parse
const parseInitialize = () => {
  const appId = process.env.REACT_APP_PARSE_APPLICATION_ID;
  const jsKey = process.env.REACT_APP_PARSE_JAVASCRIPT_KEY;
  const serverURL = process.env.REACT_APP_PARSE_SERVER_URL;

  if (!appId || !jsKey || !serverURL) {
    console.error("ParseClient initialization failed: Missing environment variables.");
    return;
  }

  Parse.initialize(appId, jsKey);
  if (!serverURL.endsWith("/parse")) {
    Parse.serverURL = serverURL + "/parse";
  } else {
    Parse.serverURL = serverURL;
  }

  // Note: The sessionToken in localStorage is from our custom auth system (JWT),
  // not a Parse session token. Parse operations will work without authentication
  // and the Identity class will fall back to blockchain data when needed.
};

export default parseInitialize;
