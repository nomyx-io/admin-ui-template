import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Spin, Card, Descriptions, Button, Tag, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
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
            icon={<ArrowLeftOutlined />} 
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
              <Descriptions bordered column={1}>
                <Descriptions.Item label="ID">{identityData.id}</Descriptions.Item>
                <Descriptions.Item label="Display Name">
                  {identityData.displayName || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Wallet Address">
                  <code>{identityData.identityAddress || identityData.walletAddress || "N/A"}</code>
                </Descriptions.Item>
                <Descriptions.Item label="KYC ID">
                  {identityData.kyc_id || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag>{identityData.type || "N/A"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color="orange">{identityData.status || "PENDING"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="PEP Matched">
                  <Tag color={identityData.pepMatched ? "red" : "green"}>
                    {identityData.pepMatched ? "Yes" : "No"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Watchlist Matched">
                  <Tag color={identityData.watchlistMatched ? "red" : "green"}>
                    {identityData.watchlistMatched ? "Yes" : "No"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                  {identityData.createdAt ? new Date(identityData.createdAt).toLocaleString() : "N/A"}
                </Descriptions.Item>
              </Descriptions>
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