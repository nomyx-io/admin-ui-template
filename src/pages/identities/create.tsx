import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useBlockchainService } from "../../hooks/useBlockchainService";
import IdentityService from "../../services/IdentityService";
import BlockchainService from "../../services/BlockchainService";
import AppLayout from "../../components/AppLayout";

// Dynamically import to avoid SSR issues
const CreateDigitalId = dynamic(() => import("../../components/CreateDigitalId"), {
  ssr: false,
});

export default function CreateIdentityPage() {
  const { blockchainService, loading: serviceLoading } = useBlockchainService();
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize identity service with the blockchain service
    if (blockchainService && !serviceLoading) {
      try {
        const service = new IdentityService(blockchainService);
        setIdentityService(service);
      } catch (error) {
        console.error("[CreateIdentityPage] Failed to initialize identity service:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [blockchainService, serviceLoading]);

  if (loading || serviceLoading) {
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
      <CreateDigitalId service={identityService} />
    </AppLayout>
  );
}