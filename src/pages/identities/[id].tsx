import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import BlockchainService from "../../services/BlockchainService";
import IdentityService from "../../services/IdentityService";
import AppLayout from "../../components/AppLayout";

// Dynamically import to avoid SSR issues
const DigitalIdentityDetailPage = dynamic(() => import("../../components/DigitalIdentityDetailPage"), {
  ssr: false,
});

export default function ViewIdentityPage() {
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize services
    const initService = async () => {
      try {
        const selectedChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
        console.log("[ViewIdentityPage] Initializing blockchain service for:", selectedChain);
        const blockchainService = new BlockchainService();
        await blockchainService.initialize(selectedChain);
        console.log("[ViewIdentityPage] Blockchain service initialized successfully");
        const service = new IdentityService(blockchainService);
        setIdentityService(service);
      } catch (error) {
        console.error("[ViewIdentityPage] Failed to initialize identity service:", error);
        // Try to initialize with a fallback service
        try {
          const blockchainService = new BlockchainService();
          blockchainService.initialized = true;
          blockchainService.currentChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
          const service = new IdentityService(blockchainService);
          setIdentityService(service);
        } catch (fallbackError) {
          console.error("[ViewIdentityPage] Fallback initialization also failed:", fallbackError);
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
      <DigitalIdentityDetailPage service={identityService} />
    </AppLayout>
  );
}