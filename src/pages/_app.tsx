import React, { useEffect, useRef } from "react";
import type { AppProps } from "next/app";
import ConfigProvider from "antd/es/config-provider";
import { AntdRegistry } from "@ant-design/nextjs-registry";
const { ToastContainer } = require("react-toastify");
import { RoleProvider } from "../context/RoleContext";
import { BlockchainServiceManager } from "@nomyx/shared";
import ErrorBoundary from "../components/ErrorBoundary";
import Parse from "parse";

import "react-toastify/dist/ReactToastify.css";
import "../index.css";

// Initialize Parse
if (typeof window !== "undefined") {
  const appId = process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID;
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY;
  const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL;

  if (appId && jsKey && serverURL) {
    Parse.initialize(appId, jsKey);
    Parse.serverURL = serverURL;
    // Make Parse available globally for components that need it
    (window as any).Parse = Parse;
    console.log('[Admin Portal] Parse initialized and available as window.Parse');
  } else {
    console.warn('[Admin Portal] Parse credentials not fully configured');
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  const serviceManager = useRef(BlockchainServiceManager.getInstance()).current;
  
  // Initialize service manager on mount
  useEffect(() => {
    const initServices = async () => {
      try {
        if (!serviceManager.isServiceInitialized()) {
          // Get saved chain preference or default to ethereum-local
          const savedChain = localStorage.getItem("nomyx-selected-chain") || 'ethereum-local';
          // Pass login route for session validation service
          await serviceManager.initialize(savedChain, '/login');
        }

        // Also set up Parse session if we have a session token
        const sessionToken = localStorage.getItem('sessionToken');
        if (sessionToken && typeof window !== 'undefined' && (window as any).Parse) {
          try {
            await (window as any).Parse.User.become(sessionToken);
            console.log('[Admin Portal] Parse user session restored');
          } catch (error) {
            console.warn('[Admin Portal] Could not restore Parse session:', error);
          }
        }
      } catch (error) {
        console.error('[Admin Portal] Failed to initialize blockchain services:', error);
      }
    };
    initServices();
  }, []);

  return (
    <ErrorBoundary>
      <AntdRegistry>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#1890ff",
            },
          }}
        >
          <RoleProvider>
            <Component {...pageProps} />
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </RoleProvider>
        </ConfigProvider>
      </AntdRegistry>
    </ErrorBoundary>
  );
}

export default MyApp;