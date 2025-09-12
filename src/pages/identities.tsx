import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useBlockchainService } from "../hooks/useBlockchainService";
import IdentityService from "../services/IdentityService";
import AppLayout from "../components/AppLayout";
import useWalletProtection from "../hooks/useWalletProtection";

// Dynamically import to avoid SSR issues
const IdentitiesPage = dynamic(() => import("../components/IdentitiesPage"), {
  ssr: false,
});

export default function Identities() {
  const { blockchainService, loading: serviceLoading, selectedChain } = useBlockchainService();
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);
  const { onWalletRequired, WalletModal } = useWalletProtection();

  useEffect(() => {
    if (blockchainService && !serviceLoading) {
      console.log(`[IdentitiesPage] Initializing identity service for chain: ${selectedChain}`);
      const service = new IdentityService(blockchainService, onWalletRequired);
      setIdentityService(service);
      
      // Force a small delay to ensure the service is fully ready
      // This helps with navigation from CreateDigitalId
      setTimeout(() => {
        console.log(`[IdentitiesPage] Service ready, triggering initial fetch`);
        setIdentityService(service);
      }, 100);
    } else if (serviceLoading) {
      // Clear service when loading or switching chains
      console.log(`[IdentitiesPage] Service loading, clearing identity service`);
      setIdentityService(null);
    }
  }, [blockchainService, serviceLoading, selectedChain]);

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
      {WalletModal}
    </AppLayout>
  );
}