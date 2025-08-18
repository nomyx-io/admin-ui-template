import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Spin, Card, Button, Space } from "antd";

import BlockchainService from "../../../services/BlockchainService";
import IdentityService from "../../../services/IdentityService";
import AppLayout from "../../../components/AppLayout";

export default function ViewPendingIdentityPage() {
  const router = useRouter();
  const { id } = router.query;
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);
  const [identityData, setIdentityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize services
    const initService = async () => {
      try {
        const selectedChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
        console.log("[ViewPendingIdentityPage] Initializing blockchain service for:", selectedChain);
        const blockchainService = new BlockchainService();
        await blockchainService.initialize(selectedChain);
        console.log("[ViewPendingIdentityPage] Blockchain service initialized successfully");
        const service = new IdentityService(blockchainService);
        setIdentityService(service);
      } catch (error) {
        console.error("[ViewPendingIdentityPage] Failed to initialize identity service:", error);
        // Try to initialize with a fallback service
        try {
          const blockchainService = new BlockchainService();
          blockchainService.initialized = true;
          blockchainService.currentChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
          const service = new IdentityService(blockchainService);
          setIdentityService(service);
        } catch (fallbackError) {
          console.error("[ViewPendingIdentityPage] Fallback initialization also failed:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    initService();
  }, []);

  useEffect(() => {
    const loadIdentityData = async () => {
      if (identityService && id) {
        try {
          // Fetch pending identity data
          const pendingIdentities = await identityService.getPendingIdentities();
          const identity = pendingIdentities.find((i: any) => i.id === id);
          if (identity) {
            setIdentityData(identity);
          }
        } catch (error) {
          console.error("Error loading pending identity data:", error);
        }
      }
    };

    loadIdentityData();
  }, [identityService, id]);

  const handleApprove = async () => {
    if (identityData) {
      const { displayName, identityAddress, kyc_id } = identityData;
      router.push(`/identities/create?displayName=${displayName}&walletAddress=${identityAddress}&accountNumber=${kyc_id}`);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{
          minHeight: "400px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: "24px" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Button
            onClick={() => router.push("/identities")}
          >
            Back to Identities
          </Button>

          <Card
            title="Pending Identity Details"
            extra={
              <Space>
                <Button type="primary" onClick={handleApprove}>
                  Approve
                </Button>
                <Button danger>
                  Deny
                </Button>
              </Space>
            }
          >
            {identityData ? (
              <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9', backgroundColor: '#fafafa' }}>
                  <strong>ID:</strong> {identityData.id}
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Display Name:</strong> {identityData.displayName || "N/A"}
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Wallet Address:</strong> <code>{identityData.identityAddress || identityData.walletAddress || "N/A"}</code>
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>KYC ID:</strong> {identityData.kyc_id || "N/A"}
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Type:</strong> <span style={{ padding: '2px 8px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>{identityData.type || "N/A"}</span>
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Status:</strong> <span style={{ padding: '2px 8px', backgroundColor: '#ffd591', color: '#d46b08', borderRadius: '4px', fontSize: '12px' }}>{identityData.status || "PENDING"}</span>
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>PEP Matched:</strong> <span style={{ padding: '2px 8px', backgroundColor: identityData.pepMatched ? '#ffccc7' : '#d9f7be', color: identityData.pepMatched ? '#cf1322' : '#389e0d', borderRadius: '4px', fontSize: '12px' }}>
                    {identityData.pepMatched ? "Yes" : "No"}
                  </span>
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Watchlist Matched:</strong> <span style={{ padding: '2px 8px', backgroundColor: identityData.watchlistMatched ? '#ffccc7' : '#d9f7be', color: identityData.watchlistMatched ? '#cf1322' : '#389e0d', borderRadius: '4px', fontSize: '12px' }}>
                    {identityData.watchlistMatched ? "Yes" : "No"}
                  </span>
                </div>
                <div style={{ padding: '16px' }}>
                  <strong>Created At:</strong> {identityData.createdAt ? new Date(identityData.createdAt).toLocaleString() : "N/A"}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin />
                <p>Loading pending identity details...</p>
              </div>
            )}
          </Card>
        </Space>
      </div>
    </AppLayout>
  );
}