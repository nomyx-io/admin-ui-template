import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useBlockchainService } from "../hooks/useBlockchainService";
import BlockchainService from "../services/BlockchainService";
import AppLayout from "../components/AppLayout";

// Dynamically import to avoid SSR issues
const ClaimTopicsPage = dynamic(() => import("../components/ClaimTopicsPage"), {
  ssr: false,
});

export default function TopicsPage() {
  const { blockchainService: unifiedService, loading: serviceLoading, selectedChain } = useBlockchainService();
  const [blockchainService, setBlockchainService] = useState<BlockchainService | null>(null);

  useEffect(() => {
    if (unifiedService && !serviceLoading) {
      // Create BlockchainService wrapper that uses the UnifiedBlockchainService
      const wrapper = new BlockchainService();
      wrapper.unifiedService = unifiedService;
      wrapper.currentChain = selectedChain;
      wrapper.initialized = true;
      setBlockchainService(wrapper);
      console.log(`[TopicsPage] Service initialized for chain: ${selectedChain}`);
    } else {
      // Clear service when loading or switching chains
      setBlockchainService(null);
    }
  }, [unifiedService, serviceLoading, selectedChain]);

  if (serviceLoading || !blockchainService) {
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
      <ClaimTopicsPage service={blockchainService} />
    </AppLayout>
  );
}