import React from "react";
import type { AppProps } from "next/app";
import ConfigProvider from "antd/es/config-provider";
import { AntdRegistry } from "@ant-design/nextjs-registry";
const { ToastContainer } = require("react-toastify");
import { RoleProvider } from "../context/RoleContext";
import { UniversalWalletProvider } from "../context/UniversalWalletContext";
import Parse from "parse";

import "react-toastify/dist/ReactToastify.css";
import "../index.css";

// Initialize Parse
if (typeof window !== "undefined") {
  Parse.initialize(
    process.env.NEXT_PUBLIC_PARSE_APPLICATION_ID || "test-app-id",
    process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY || "test-javascript-key"
  );
  Parse.serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL || "http://localhost:1338/parse";
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#1890ff",
          },
        }}
      >
        <RoleProvider>
          <UniversalWalletProvider>
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
          </UniversalWalletProvider>
        </RoleProvider>
      </ConfigProvider>
    </AntdRegistry>
  );
}

export default MyApp;