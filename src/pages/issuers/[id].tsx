import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Spin, Card, Button, Space } from "antd";

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
            onClick={() => router.push("/issuers")}
          >
            Back to Trusted Issuers
          </Button>

          <Card title="Trusted Issuer Details">
            {issuerData ? (
              <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9', backgroundColor: '#fafafa' }}>
                  <strong>ID:</strong> {issuerData.id || id}
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Name:</strong> {issuerData.attributes?.name || "N/A"}
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Address:</strong> <code>{issuerData.attributes?.issuer || issuerData.attributes?.address || "N/A"}</code>
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Claim Topics:</strong> {issuerData.attributes?.claimTopics?.map((topic: any) => (
                    <span key={typeof topic === 'object' ? topic.topic || JSON.stringify(topic) : topic} style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px', margin: '2px' }}>
                      {typeof topic === 'object' ? topic.topic || JSON.stringify(topic) : topic}
                    </span>
                  )) || "No claim topics"}
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Status:</strong> <span style={{ padding: '2px 8px', backgroundColor: issuerData.attributes?.active ? '#d9f7be' : '#ffccc7', color: issuerData.attributes?.active ? '#389e0d' : '#cf1322', borderRadius: '4px', fontSize: '12px' }}>
                    {issuerData.attributes?.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
                  <strong>Created At:</strong> {issuerData.createdAt ? new Date(issuerData.createdAt).toLocaleString() : "N/A"}
                </div>
                <div style={{ padding: '16px' }}>
                  <strong>Updated At:</strong> {issuerData.updatedAt ? new Date(issuerData.updatedAt).toLocaleString() : "N/A"}
                </div>
              </div>
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