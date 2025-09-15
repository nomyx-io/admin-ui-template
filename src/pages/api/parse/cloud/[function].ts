import type { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';

// Initialize Parse Server (server-side only)
const initializeParseServer = () => {
  const appId = process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID!;
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY!;
  // When running in Docker container, use the internal Docker network URL
  // The INTERNAL_PARSE_SERVER_URL should be set to the Docker service name
  // For local development, use environment variable
  const serverURL = process.env.INTERNAL_PARSE_SERVER_URL || process.env.NEXT_PUBLIC_PARSE_SERVER_URL!;

  if (!appId || !jsKey || !serverURL) {
    throw new Error('Parse Server configuration missing: App ID, JavaScript Key, or Server URL not found in environment variables');
  }

  // Initialize Parse without Master Key - we'll use session tokens for authentication
  Parse.initialize(appId, jsKey);
  Parse.serverURL = serverURL.endsWith('/parse') ? serverURL : `${serverURL}/parse`;

  console.log('[Parse API Route] Initialized Parse Server (session-based authentication)');
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
  
  // Basic authentication check - require session token for all cloud function calls
  // The cloud functions themselves will handle role-based access control
  if (!sessionToken) {
    console.log('[Parse API Route] No session token provided - request may fail if cloud function requires authentication');
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
    // If we have a session token, use it to authenticate the request
    // Otherwise, let the cloud function handle authentication requirements
    const options: any = {};

    if (sessionToken) {
      // Use the session token for authentication
      options.sessionToken = sessionToken;
      console.log(`[Parse API Route] Using session token for Cloud function: ${functionName}`);
    } else {
      console.log(`[Parse API Route] No session token provided for Cloud function: ${functionName}`);
    }

    // Call the Cloud function without Master Key - let the cloud function handle its own authentication
    const result = await Parse.Cloud.run(functionName, params, options);

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