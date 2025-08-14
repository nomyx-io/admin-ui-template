import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import BlockchainService from "../services/BlockchainService";
import AppLayout from "../components/AppLayout";

// Dynamically import to avoid SSR issues
const TrustedIssuersPage = dynamic(() => import("../components/TrustedIssuersPage"), {
  ssr: false,
});

export default function IssuersPage() {
  const [blockchainService, setBlockchainService] = useState<BlockchainService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    // Initialize blockchain service
    const initService = async () => {
      try {
        const selectedChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
        console.log("[IssuersPage] Initializing blockchain service for:", selectedChain);
        const service = new BlockchainService();
        await service.initialize(selectedChain);
        console.log("[IssuersPage] Blockchain service initialized successfully");
        setBlockchainService(service);
        setError(null);
      } catch (error) {
        console.error("[IssuersPage] Failed to initialize blockchain service:", error);
        setError(error.message || "Failed to initialize blockchain service");
        // Try to initialize with a fallback service
        try {
          const service = new BlockchainService();
          service.initialized = true;
          service.currentChain = localStorage.getItem("nomyx-selected-chain") || "ethereum-local";
          setBlockchainService(service);
        } catch (fallbackError) {
          console.error("[IssuersPage] Fallback initialization also failed:", fallbackError);
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
      <TrustedIssuersPage service={blockchainService} />
    </AppLayout>
  );
}