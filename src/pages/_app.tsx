import React, { useEffect, useRef } from "react";
import type { AppProps } from "next/app";
import ConfigProvider from "antd/es/config-provider";
import { AntdRegistry } from "@ant-design/nextjs-registry";
const { ToastContainer } = require("react-toastify");
import { RoleProvider } from "../context/RoleContext";
import { BlockchainServiceManager, WalletProviderFactory } from "@nomyx/shared";
import ErrorBoundary from "../components/ErrorBoundary";
import Parse from "parse";

import "react-toastify/dist/ReactToastify.css";
import "../index.css";

// Initialize Parse with required environment variables
if (typeof window !== "undefined") {
  const appId = process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID!;
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY!;
  const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL!;

  Parse.initialize(appId, jsKey);
  Parse.serverURL = serverURL;

  // CRITICAL: Disable Parse SDK automatic retries to prevent "Challenge already used" errors
  // The Parse SDK retries 5XX errors by default (REQUEST_ATTEMPT_LIMIT = 5)
  // This causes issues with DFNS single-use challenges
  (Parse as any).CoreManager.set('REQUEST_ATTEMPT_LIMIT', 1);
  console.log('[Admin Portal] Parse retry limit set to 1 (no retries)');

  // Make Parse available globally for components that need it
  (window as any).Parse = Parse;
  console.log('[Admin Portal] Parse initialized and available as window.Parse');

  // Initialize WalletProviderFactory with Parse instance
  // This allows DFNS wallet to use the portal's Parse instance
  WalletProviderFactory.initialize(Parse);
  console.log('[Admin Portal] WalletProviderFactory initialized with Parse instance');
}

function MyApp({ Component, pageProps }: AppProps) {
  const serviceManager = useRef(BlockchainServiceManager.getInstance()).current;
  
  // Initialize service manager on mount (but skip on login page)
  useEffect(() => {
    const initServices = async () => {
      // Skip initialization on login page
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        console.log('[Admin Portal] Skipping blockchain initialization on login page');
        return;
      }

      try {
        if (!serviceManager.isServiceInitialized()) {
          // Use NEXT_PUBLIC_SELECTED_CHAIN instead of localStorage
          const targetChain = process.env.NEXT_PUBLIC_SELECTED_CHAIN || 'stellar-local';
          console.log('[Admin Portal] Initializing blockchain service with chain:', targetChain);
          await serviceManager.initialize(targetChain);
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