import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Spin, Card, Descriptions, Button, Tag, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import BlockchainService from "../../services/BlockchainService";
import AppLayout from "../../components/AppLayout";

export default function ViewIssuerPage() {
  const router = useRouter();
  const { id } = router.query;
  const [blockchainService, setBlockchainService] = useState<BlockchainService | null>(null);
  const [issuerData, setIssuerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize blockchain service
    const initService = async () => {
      try {
        const selectedChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
        console.log("[ViewIssuerPage] Initializing blockchain service for:", selectedChain);
        const service = new BlockchainService();
        await service.initialize(selectedChain);
        console.log("[ViewIssuerPage] Blockchain service initialized successfully");
        setBlockchainService(service);
      } catch (error) {
        console.error("[ViewIssuerPage] Failed to initialize blockchain service:", error);
        // Try to initialize with a fallback service
        try {
          const service = new BlockchainService();
          service.initialized = true;
          service.currentChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
          setBlockchainService(service);
        } catch (fallbackError) {
          console.error("[ViewIssuerPage] Fallback initialization also failed:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    initService();
  }, []);

  useEffect(() => {
    const loadIssuerData = async () => {
      if (blockchainService && id) {
        try {
          // ID is actually the issuer address - fetch all issuers and find the matching one
          const decodedAddress = decodeURIComponent(id as string);
          const allIssuers = await blockchainService.getTrustedIssuers();
          
          // Find the issuer with matching address
          const issuer = allIssuers?.find((i: any) => 
            i.attributes?.issuer === decodedAddress
          );
          
          if (issuer) {
            setIssuerData(issuer);
          } else {
            console.error("Issuer not found with address:", decodedAddress);
          }
        } catch (error) {
          console.error("Error loading issuer data:", error);
        }
      }
    };

    loadIssuerData();
  }, [blockchainService, id]);

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
            onClick={() => router.push("/issuers")}
          >
            Back to Trusted Issuers
          </Button>

          <Card title="Trusted Issuer Details">
            {issuerData ? (
              <Descriptions bordered column={1}>
                <Descriptions.Item label="ID">{issuerData.id || id}</Descriptions.Item>
                <Descriptions.Item label="Name">
                  {issuerData.attributes?.name || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  <code>{issuerData.attributes?.issuer || issuerData.attributes?.address || "N/A"}</code>
                </Descriptions.Item>
                <Descriptions.Item label="Claim Topics">
                  {issuerData.attributes?.claimTopics?.map((topic: any) => (
                    <Tag key={typeof topic === 'object' ? topic.topic || JSON.stringify(topic) : topic}>
                      {typeof topic === 'object' ? topic.topic || JSON.stringify(topic) : topic}
                    </Tag>
                  )) || "No claim topics"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={issuerData.attributes?.active ? "green" : "red"}>
                    {issuerData.attributes?.active ? "Active" : "Inactive"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                  {issuerData.createdAt ? new Date(issuerData.createdAt).toLocaleString() : "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Updated At">
                  {issuerData.updatedAt ? new Date(issuerData.updatedAt).toLocaleString() : "N/A"}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin />
                <p>Loading issuer details...</p>
              </div>
            )}
          </Card>
        </Space>
      </div>
    </AppLayout>
  );
}