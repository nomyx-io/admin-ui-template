import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Spin, Card, Button, Space } from "antd";
import Tag from "antd/es/tag";
import Descriptions from "antd/es/descriptions";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useBlockchainService } from "../../hooks/useBlockchainService";
import AppLayout from "../../components/AppLayout";

export default function ViewIssuerPage() {
  const router = useRouter();
  const { id } = router.query;
  const { blockchainService, loading, error } = useBlockchainService();
  const [issuerData, setIssuerData] = useState<any>(null);

  useEffect(() => {
    const loadIssuerData = async () => {
      if (blockchainService && id) {
        try {
          // ID is actually the issuer address - fetch all issuers and find the matching one
          const decodedAddress = decodeURIComponent(id as string);
          const allIssuers = await blockchainService.getTrustedIssuers();
          
          // Find the issuer with matching address (handle both Ethereum and Stellar formats)
          const issuer = allIssuers?.find((i: any) => 
            i.attributes?.issuer === decodedAddress || // Ethereum format
            i.issuer === decodedAddress || // Stellar format
            i.issuer_address === decodedAddress // Alternative Stellar format
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
                  {issuerData.attributes?.name || issuerData.name || issuerData.verifierName || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  <code>{issuerData.attributes?.issuer || issuerData.attributes?.address || issuerData.issuer || issuerData.issuer_address || "N/A"}</code>
                </Descriptions.Item>
                <Descriptions.Item label="Claim Topics">
                  {(issuerData.attributes?.claimTopics || issuerData.claimTopics || issuerData.claim_topics)?.map((topic: any) => (
                    <Tag key={typeof topic === 'object' ? topic.topic || JSON.stringify(topic) : topic}>
                      {typeof topic === 'object' ? topic.topic || JSON.stringify(topic) : topic}
                    </Tag>
                  )) || "No claim topics"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={(issuerData.attributes?.active ?? issuerData.active ?? true) ? "green" : "red"}>
                    {(issuerData.attributes?.active ?? issuerData.active ?? true) ? "Active" : "Inactive"}
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