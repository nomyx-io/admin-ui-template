import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useBlockchainService } from "../../hooks/useBlockchainService";
import IdentityService from "../../services/IdentityService";
import AppLayout from "../../components/AppLayout";

// Dynamically import to avoid SSR issues
const DigitalIdentityDetailPage = dynamic(() => import("../../components/DigitalIdentityDetailPage"), {
  ssr: false,
});

export default function ViewIdentityPage() {
  const { blockchainService, loading: serviceLoading, error } = useBlockchainService();
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize identity service when blockchain service is ready
    if (blockchainService && !serviceLoading) {
      const service = new IdentityService(blockchainService);
      setIdentityService(service);
      setLoading(false);
    }
  }, [blockchainService, serviceLoading]);

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