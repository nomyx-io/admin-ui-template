"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Space, message } from "antd";
import Badge from "antd/es/badge";
import Tooltip from "antd/es/tooltip";
import Select from "antd/es/select";
import Modal from "antd/es/modal";

// Client-only wrapper for BlockchainSelectionManager
const ClientBlockchainSelector = (props: any) => {
  const [Component, setComponent] = useState<any>(null);

  useEffect(() => {
    // Dynamically import the factory function to avoid SSR and React instance issues
    import("@nomyx/shared").then((mod) => {
      if (mod.createBlockchainSelectionManager) {
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
          message
        });
        setComponent(() => BlockchainSelectionManager);
      }
    });
  }, []);

  if (!Component) {
    return <div>Loading blockchain selector...</div>;
  }

  return <Component {...props} />;
};

export default ClientBlockchainSelector;