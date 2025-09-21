"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Space, message } from "antd";
import Badge from "antd/es/badge";
import Tooltip from "antd/es/tooltip";
import Select from "antd/es/select";
import Modal from "antd/es/modal";
import '@xyflow/react/dist/style.css';

// Client-only wrapper for BlockchainSelectionManager
const ClientBlockchainSelector = (props: any) => {
  const [Component, setComponent] = useState<any>(null);

  useEffect(() => {
    // Dynamically import both the factory function and React Flow
    Promise.all([
      import("@nomyx/shared"),
      import("@xyflow/react")
    ]).then(([mod, reactFlowMod]) => {
      if (mod.createBlockchainSelectionManager) {
        // Create the Diamond Architecture Modal component if available
        const DiamondModal = mod.createDiamondArchitectureModal
          ? mod.createDiamondArchitectureModal(React, {
              useState,
              useEffect,
              useMemo,
              useCallback,
              ReactFlow: reactFlowMod.ReactFlow,
              ReactFlowProvider: reactFlowMod.ReactFlowProvider,
              Controls: reactFlowMod.Controls,
              MiniMap: reactFlowMod.MiniMap,
              Background: reactFlowMod.Background,
              Handle: reactFlowMod.Handle,
              Position: reactFlowMod.Position,
              useNodesState: reactFlowMod.useNodesState,
              useEdgesState: reactFlowMod.useEdgesState
            })
          : undefined;

        // Create the component with the portal's React instance
        const BlockchainSelectionManager = mod.createBlockchainSelectionManager(React, {
          useState,
          useEffect,
          useCallback,
          useMemo,
          Select,
          Button,
          Space,
          Modal,
          Tooltip,
          Badge,
          message,
          createDiamondArchitectureModal: DiamondModal ? () => DiamondModal : undefined,
          // Pass React Flow components
          ReactFlow: reactFlowMod.ReactFlow,
          ReactFlowProvider: reactFlowMod.ReactFlowProvider,
          Controls: reactFlowMod.Controls,
          MiniMap: reactFlowMod.MiniMap,
          Background: reactFlowMod.Background,
          Handle: reactFlowMod.Handle,
          Position: reactFlowMod.Position,
          useNodesState: reactFlowMod.useNodesState,
          useEdgesState: reactFlowMod.useEdgesState
        });
        setComponent(() => BlockchainSelectionManager);
      }
    });
  }, []);

  if (!Component) {
    return <div>Loading blockchain selector...</div>;
  }

  // Pass environment variables as props for wallet addresses
  // Using fallback values since process.env is not available on client side
  const enhancedProps = {
    ...props,
    stellarDevAddress: process.env.NEXT_PUBLIC_STELLAR_DEV_ADDRESS!,
    stellarDev2Address: process.env.NEXT_PUBLIC_STELLAR_DEV2_ADDRESS!,
    devWalletAddress: process.env.NEXT_PUBLIC_STELLAR_DEV_ADDRESS!,
    dev2WalletAddress: process.env.NEXT_PUBLIC_STELLAR_DEV2_ADDRESS!
  };

  return <Component {...enhancedProps} />;
};

export default ClientBlockchainSelector;