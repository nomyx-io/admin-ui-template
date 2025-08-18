import React from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useBlockchainService } from "../../../hooks/useBlockchainService";
import AppLayout from "../../../components/AppLayout";

// Dynamically import to avoid SSR issues
const EditClaimTopic = dynamic(() => import("../../../components/EditClaimTopic"), {
  ssr: false,
});

export default function EditTopicPage() {
  const { blockchainService, loading, error } = useBlockchainService();

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
      <EditClaimTopic service={blockchainService} />
    </AppLayout>
  );
}