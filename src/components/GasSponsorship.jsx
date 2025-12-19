import React, { useState, useEffect } from "react";

const FeeSponsorshipBalance = ({ blockchainService }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const walletAddress = process.env.REACT_APP_FEE_SPONSORSHIP_WALLET;

  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress) {
        setError("Fee sponsorship wallet address not configured");
        setLoading(false);
        return;
      }

      if (!blockchainService) {
        setError("Blockchain service not available");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const balanceResult = await blockchainService.getNativeBalance(walletAddress);
        setBalance(balanceResult);
      } catch (err) {
        console.error("Failed to fetch fee sponsorship balance:", err);
        setError("Failed to fetch balance");
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [walletAddress, blockchainService]);

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      <style>{`
        .sponsorship-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          max-width: 500px;
          padding: 24px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .sponsorship-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 20px 0;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }
        
        .balance-display {
          width: 100%;
          padding: 12px 16px;
          font-size: 16px;
          color: #1a1a1a;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-family: monospace;
        }
        
        .wallet-display {
          width: 100%;
          padding: 12px 16px;
          font-size: 14px;
          color: #6b7280;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-family: monospace;
        }
        
        .loading-text {
          color: #6b7280;
          font-size: 14px;
          padding: 12px 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        
        .error-text {
          color: #dc2626;
          font-size: 14px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
        }
      `}</style>

      <div className="sponsorship-container">
        <h3 className="sponsorship-title">Fee Sponsorship Wallet</h3>

        <div className="form-group">
          <label className="form-label">Wallet Balance</label>
          {loading && <div className="loading-text">Loading balance...</div>}
          {error && <div className="error-text">{error}</div>}
          {!loading && !error && balance !== null && <div className="balance-display">{balance} ETH</div>}
        </div>

        {!loading && !error && balance !== null && (
          <div className="form-group">
            <label className="form-label">Wallet Address</label>
            <div className="wallet-display">{walletAddress}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default FeeSponsorshipBalance;
