import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useBlockchainService } from "../hooks/useBlockchainService";
import IdentityService from "../services/IdentityService";
import AppLayout from "../components/AppLayout";

// Dynamically import to avoid SSR issues
const IdentitiesPage = dynamic(() => import("../components/IdentitiesPage"), {
  ssr: false,
});

export default function Identities() {
  const { blockchainService, loading: serviceLoading } = useBlockchainService();
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);

  useEffect(() => {
    if (blockchainService && !serviceLoading) {
      console.log("[IdentitiesPage] Initializing identity service with blockchain service");
      const service = new IdentityService(blockchainService);
      setIdentityService(service);
    }
  }, [blockchainService, serviceLoading]);

  if (serviceLoading) {
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
      <IdentitiesPage service={identityService} />
    </AppLayout>
  );
}