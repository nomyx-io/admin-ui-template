import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useBlockchainService } from "../../../hooks/useBlockchainService";
import AppLayout from "../../../components/AppLayout";
import BlockchainService from "../../../services/BlockchainService";

// Dynamically import to avoid SSR issues
const EditClaimTopic = dynamic(() => import("../../../components/EditClaimTopic"), {
  ssr: false,
});

export default function EditTopicPage() {
  const { blockchainService, loading, error } = useBlockchainService();

  // Create a wrapper service that includes the getClaimTopicById method
  const wrappedService = useMemo(() => {
    if (!blockchainService) return null;

    // Create an instance of the BlockchainService wrapper
    const service = new BlockchainService();
    // The service will use the existing singleton manager internally
    service.initialized = true; // Mark as initialized since manager is already initialized

    return service;
  }, [blockchainService]);

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
      <EditClaimTopic service={wrappedService} />
    </AppLayout>
  );
}