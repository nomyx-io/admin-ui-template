import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import BlockchainService from "../../services/BlockchainService";
import IdentityService from "../../services/IdentityService";
import AppLayout from "../../components/AppLayout";

// Dynamically import to avoid SSR issues
const CreateDigitalId = dynamic(() => import("../../components/CreateDigitalId"), {
  ssr: false,
});

export default function CreateIdentityPage() {
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize services
    const initService = async () => {
      try {
        const selectedChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
        console.log("[CreateIdentityPage] Initializing blockchain service for:", selectedChain);
        const blockchainService = new BlockchainService();
        await blockchainService.initialize(selectedChain);
        console.log("[CreateIdentityPage] Blockchain service initialized successfully");
        const service = new IdentityService(blockchainService);
        setIdentityService(service);
      } catch (error) {
        console.error("[CreateIdentityPage] Failed to initialize identity service:", error);
        // Try to initialize with a fallback service
        try {
          const blockchainService = new BlockchainService();
          blockchainService.initialized = true;
          blockchainService.currentChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
          const service = new IdentityService(blockchainService);
          setIdentityService(service);
        } catch (fallbackError) {
          console.error("[CreateIdentityPage] Fallback initialization also failed:", fallbackError);
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
      <CreateDigitalId service={identityService} />
    </AppLayout>
  );
}