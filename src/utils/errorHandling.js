/**
 * Error handling utilities for the Admin Portal
 * Provides consistent error messaging and transaction feedback
 */

import { toast } from 'react-toastify';

/**
 * Error codes and their user-friendly messages
 */
const ERROR_MESSAGES = {
  // Blockchain errors
  'INVALID_ARGUMENT': 'Invalid input provided. Please check your data and try again.',
  'bad address checksum': 'Invalid wallet address format. Please verify the address.',
  'user rejected transaction': 'Transaction was cancelled by the user.',
  'insufficient funds': 'Insufficient funds to complete this transaction.',
  'nonce too low': 'Transaction nonce conflict. Please refresh and try again.',
  'replacement fee too low': 'Gas price too low. Please increase gas price and try again.',
  'transaction failed': 'Transaction failed on the blockchain.',
  
  // Network errors
  'network error': 'Network connection error. Please check your connection.',
  'timeout': 'Operation timed out. Please try again.',
  'rate limit': 'Too many requests. Please wait a moment and try again.',
  
  // Contract errors
  'execution reverted': 'Smart contract execution failed.',
  'contract not deployed': 'Smart contract not found at this address.',
  'already exists': 'This item already exists on the blockchain.',
  'not authorized': 'You are not authorized to perform this action.',
  'not found': 'The requested item was not found.',
  
  // Wallet errors
  'wallet not connected': 'Please connect your wallet first.',
  'wrong network': 'Please switch to the correct network.',
  'invalid private key': 'Invalid private key provided.',
  
  // Application errors
  'not initialized': 'Service not initialized. Please refresh the page.',
  'invalid chain': 'Invalid blockchain selected.',
  'validation failed': 'Input validation failed. Please check your data.',
};

/**
 * Extract a user-friendly error message from an error object
 */
export function getErrorMessage(error) {
  if (!error) return 'An unknown error occurred';
  
  // Check if error has a specific message
  const errorStr = error.message || error.toString();
  
  // Look for known error patterns
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorStr.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  // Check for specific blockchain error properties
  if (error.code) {
    switch (error.code) {
      case 'INVALID_ARGUMENT':
        return ERROR_MESSAGES['INVALID_ARGUMENT'];
      case 'NETWORK_ERROR':
        return ERROR_MESSAGES['network error'];
      case 'TIMEOUT':
        return ERROR_MESSAGES['timeout'];
      case 'INSUFFICIENT_FUNDS':
        return ERROR_MESSAGES['insufficient funds'];
      case 'NONCE_EXPIRED':
        return ERROR_MESSAGES['nonce too low'];
      case 'REPLACEMENT_UNDERPRICED':
        return ERROR_MESSAGES['replacement fee too low'];
      case 4001: // MetaMask user rejection
        return ERROR_MESSAGES['user rejected transaction'];
      default:
        break;
    }
  }
  
  // If no specific pattern matched, return a generic message with details
  if (error.reason) {
    return `Blockchain error: ${error.reason}`;
  }
  
  // Return the original error message if nothing else matches
  return errorStr || 'An unexpected error occurred';
}

/**
 * Display an error toast with proper formatting
 */
export function showError(error, context = '') {
  const message = getErrorMessage(error);
  const displayMessage = context ? `${context}: ${message}` : message;
  
  console.error(`[Error] ${context}:`, error);
  toast.error(displayMessage);
}

/**
 * Display a success toast with transaction details
 */
export function showSuccess(message, txHash = null) {
  if (txHash) {
    // Create a clickable transaction link (for local development)
    const shortHash = `${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}`;
    toast.success(
      <div>
        <div>{message}</div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Transaction: <code>{shortHash}</code>
        </div>
      </div>,
      { autoClose: 5000 }
    );
  } else {
    toast.success(message);
  }
}

/**
 * Display a loading toast that can be updated
 */
export function showLoading(message) {
  return toast.loading(message);
}

/**
 * Update a loading toast to success
 */
export function updateToastSuccess(toastId, message, txHash = null) {
  if (txHash) {
    const shortHash = `${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}`;
    toast.update(toastId, {
      render: (
        <div>
          <div>{message}</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Transaction: <code>{shortHash}</code>
          </div>
        </div>
      ),
      type: 'success',
      isLoading: false,
      autoClose: 5000,
    });
  } else {
    toast.update(toastId, {
      render: message,
      type: 'success',
      isLoading: false,
      autoClose: 3000,
    });
  }
}

/**
 * Update a loading toast to error
 */
export function updateToastError(toastId, error, context = '') {
  const message = getErrorMessage(error);
  const displayMessage = context ? `${context}: ${message}` : message;
  
  toast.update(toastId, {
    render: displayMessage,
    type: 'error',
    isLoading: false,
    autoClose: 5000,
  });
}

/**
 * Wrap an async operation with proper error handling and loading state
 */
export async function handleBlockchainOperation(operation, options = {}) {
  const {
    loadingMessage = 'Processing transaction...',
    successMessage = 'Operation completed successfully',
    errorContext = 'Operation failed',
    onSuccess = null,
    onError = null,
  } = options;
  
  const toastId = showLoading(loadingMessage);
  
  try {
    const result = await operation();
    
    // Extract transaction hash from various result formats
    const txHash = result?.transactionHash || result?.txHash || result?.hash || null;
    
    updateToastSuccess(toastId, successMessage, txHash);
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    return result;
  } catch (error) {
    updateToastError(toastId, error, errorContext);
    
    if (onError) {
      onError(error);
    }
    
    throw error;
  }
}

/**
 * Format blockchain addresses for display
 */
export function formatAddress(address) {
  if (!address) return '';
  
  // Ethereum addresses
  if (address.startsWith('0x')) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  // Stellar addresses
  if (address.startsWith('G')) {
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  }
  
  // Unknown format
  return address.length > 10 
    ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}`
    : address;
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(hash) {
  if (!hash) return false;
  
  // Ethereum transaction hash (66 characters including 0x)
  if (hash.startsWith('0x') && hash.length === 66) {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }
  
  // Stellar transaction hash (64 characters)
  if (hash.length === 64) {
    return /^[a-fA-F0-9]{64}$/.test(hash);
  }
  
  return false;
}