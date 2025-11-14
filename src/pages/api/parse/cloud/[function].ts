import type { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

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
  // Try to get session token from Authorization header first (client-provided)
  let sessionToken = req.headers.authorization?.replace('Bearer ', '');

  // If not in header, get it from NextAuth server session
  if (!sessionToken) {
    const session = await getServerSession(req, res, authOptions);
    if (session?.user?.accessToken) {
      sessionToken = session.user.accessToken as string;
      console.log('[Parse API Route] Using session token from NextAuth session');
    } else {
      console.warn('[Parse API Route] No session token available in header or NextAuth session');
    }
  } else {
    console.log('[Parse API Route] Using session token from Authorization header');
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

  // Require authentication for all cloud function calls
  if (!sessionToken) {
    return res.status(401).json({
      error: 'Authentication required. Please log in.',
      code: 'UNAUTHORIZED'
    });
  }

  console.log(`[Parse API Route] Calling Cloud function: ${functionName} with params:`, params);

  try {
    // Use the session token for authenticated Parse cloud function call
    const options = {
      sessionToken: sessionToken
    };

    // Call the Cloud function with session token authentication
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