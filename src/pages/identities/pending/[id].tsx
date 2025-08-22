import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Spin, Card, Button, Space } from "antd";
import Tag from "antd/es/tag";
import Descriptions from "antd/es/descriptions";
import ArrowLeftOutlined from "@ant-design/icons/ArrowLeftOutlined";
// React 19 compatibility workarounds for icons
const ArrowLeftOutlinedIcon = ArrowLeftOutlined as any;
import { useBlockchainService } from "../../../hooks/useBlockchainService";
import IdentityService from "../../../services/IdentityService";
import AppLayout from "../../../components/AppLayout";

export default function ViewPendingIdentityPage() {
  const router = useRouter();
  const { id } = router.query;
  const { blockchainService, loading: serviceLoading, error } = useBlockchainService();
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);
  const [identityData, setIdentityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize identity service when blockchain service is ready
    if (blockchainService && !serviceLoading) {
      const service = new IdentityService(blockchainService);
      setIdentityService(service);
      setLoading(false);
    }
  }, [blockchainService, serviceLoading]);

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
            icon={<ArrowLeftOutlinedIcon />} 
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