import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useBlockchainService } from "../../hooks/useBlockchainService";
import AppLayout from "../../components/AppLayout";
import BlockchainService from "../../services/BlockchainService";

// Dynamically import to avoid SSR issues
const CreateClaimTopic = dynamic(() => import("../../components/CreateClaimTopic"), {
  ssr: false,
});

export default function CreateTopicPage() {
  const { blockchainService: unifiedService, loading: serviceLoading, error, selectedChain } = useBlockchainService();
  const [blockchainService, setBlockchainService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initService = async () => {
      if (unifiedService && !serviceLoading) {
        // Create BlockchainService wrapper that uses the UnifiedBlockchainService
        const wrapper = new BlockchainService();
        wrapper.unifiedService = unifiedService;
        wrapper.currentChain = selectedChain;
        wrapper.initialized = true;
        // Don't call wrapper.initialize() - it defaults to ethereum-local and switches the chain
        // The service is already initialized via unifiedService
        setBlockchainService(wrapper);
        setLoading(false);
        console.log(`[CreateTopicPage] Service initialized for chain: ${selectedChain}`);
      } else {
        // Clear service when loading or switching chains
        setBlockchainService(null);
        setLoading(true);
      }
    };

    initService();
  }, [unifiedService, serviceLoading, selectedChain]);

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

  if (error) {
    return (
      <AppLayout>
        <div style={{ 
          minHeight: "400px", 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          color: "red"
        }}>
          Error: {error}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <CreateClaimTopic service={blockchainService} />
    </AppLayout>
  );
}