import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import BlockchainService from "../../services/BlockchainService";
import AppLayout from "../../components/AppLayout";

// Dynamically import to avoid SSR issues
const ViewClaimTopic = dynamic(() => import("../../components/ViewClaimTopic"), {
  ssr: false,
});

export default function ViewTopicPage() {
  const [blockchainService, setBlockchainService] = useState<BlockchainService | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize blockchain service
    const initService = async () => {
      try {
        const selectedChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
        console.log("[ViewTopicPage] Initializing blockchain service for:", selectedChain);
        const service = new BlockchainService();
        await service.initialize(selectedChain);
        console.log("[ViewTopicPage] Blockchain service initialized successfully");
        setBlockchainService(service);
      } catch (error) {
        console.error("[ViewTopicPage] Failed to initialize blockchain service:", error);
        // Try to initialize with a fallback service
        try {
          const service = new BlockchainService();
          service.initialized = true;
          service.currentChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
          setBlockchainService(service);
        } catch (fallbackError) {
          console.error("[ViewTopicPage] Fallback initialization also failed:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    initService();
  }, []);

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
      <ViewClaimTopic service={blockchainService} />
    </AppLayout>
  );
}