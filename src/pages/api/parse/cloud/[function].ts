import type { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';

// Initialize Parse Server with Master Key (server-side only)
const initializeParseServer = () => {
  const appId = process.env.PARSE_APPLICATION_ID || process.env.REACT_APP_PARSE_APPLICATION_ID || 'test-app-id';
  const jsKey = process.env.PARSE_JAVASCRIPT_KEY || process.env.REACT_APP_PARSE_JAVASCRIPT_KEY || 'test-javascript-key';
  const masterKey = process.env.PARSE_MASTER_KEY || 'test-master-key';
  // When running in Docker container, use the internal Docker network URL
  // The INTERNAL_PARSE_SERVER_URL should be set to the Docker service name
  // For local development, try to use localhost first
  const serverURL = process.env.INTERNAL_PARSE_SERVER_URL || 
                   process.env.PARSE_SERVER_URL || 
                   process.env.REACT_APP_PARSE_SERVER_URL ||
                   'http://localhost:1338/parse';

  if (!appId || !masterKey) {
    throw new Error('Parse Server configuration missing: App ID or Master Key not found');
  }

  // Initialize Parse with Master Key
  Parse.initialize(appId, jsKey, masterKey);
  Parse.serverURL = serverURL.endsWith('/parse') ? serverURL : `${serverURL}/parse`;
  
  // Enable Master Key usage
  Parse.masterKey = masterKey;
  
  console.log('[Parse API Route] Initialized Parse Server with Master Key');
  return true;
};

// Initialize once
let parseInitialized = false;
if (!parseInitialized) {
  try {
    parseInitialized = initializeParseServer();
  } catch (error) {
    console.error('[Parse API Route] Failed to initialize Parse:', error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // For development, check for session token in Authorization header
  // In production, you would validate this token properly
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader?.replace('Bearer ', '');
  
  // Basic authentication check - in production, validate the token properly
  // For local development, allow requests without token if master key is available
  const isLocalDev = process.env.NODE_ENV === 'development' || !process.env.PARSE_MASTER_KEY;
  if (!sessionToken && !isLocalDev) {
    return res.status(401).json({ error: 'Unauthorized - No session token provided' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { function: functionName } = req.query;
  const params = req.body || {};

  if (!functionName || typeof functionName !== 'string') {
    return res.status(400).json({ error: 'Function name is required' });
  }

  console.log(`[Parse API Route] Calling Cloud function: ${functionName} with params:`, params);

  try {
    // Call the Cloud function with Master Key privileges
    const result = await Parse.Cloud.run(functionName, params, { useMasterKey: true });
    
    console.log(`[Parse API Route] Cloud function ${functionName} executed successfully`);
    
    // Return the result
    return res.status(200).json(result);
  } catch (error: any) {
    console.error(`[Parse API Route] Error calling Cloud function ${functionName}:`, error);
    
    // Return appropriate error response
    return res.status(error.code === 141 ? 404 : 500).json({
      error: error.message || 'Internal server error',
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}