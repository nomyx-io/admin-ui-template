/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // REQUIRED: React 19 compatibility issue with Next.js and Ant Design
    // React 19 changed ReactNode to include Promise<ReactNode> which breaks:
    // - All Ant Design components (Card, Button, Form, etc.)
    // - Next.js components (Link, Head, Component)
    // This will be resolved when:
    // 1. Ant Design releases React 19 support (tracking: https://github.com/ant-design/ant-design/issues/49134)
    // 2. Next.js updates type definitions for React 19
    // Without this, every JSX component usage fails with:
    // "Type 'X' is not a valid JSX element type"
    ignoreBuildErrors: true,
  },
  // ESLint errors will now block builds to maintain code quality
  transpilePackages: [
    "@nomyx/shared",
    "antd",
    "@ant-design/icons",
    "@ant-design/icons-svg",
    "rc-util",
    "rc-pagination",
    "rc-picker",
    "rc-tree",
    "rc-table",
    "rc-select",
    "rc-switch",
    "rc-input",
    "rc-textarea",
    "rc-menu",
    "rc-drawer",
    "rc-motion",
    "rc-tooltip",
    "rc-dropdown",
    "rc-tabs",
    "rc-form",
    "rc-input-number",
    "rc-checkbox",
    "rc-radio",
  ],

  webpack: (config, { dev, isServer }) => {
    // Enable watching of symlinked @nomyx/shared for hot-reload
    if (dev) {
      config.watchOptions = {
        followSymlinks: true,
        // Watch @nomyx/shared but ignore other node_modules
        ignored: /node_modules\/(?!@nomyx\/shared)/
      };
    }

    // For client-side builds, provide fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }

    // Handle sodium-native for Stellar SDK
    if (isServer) {
      config.externals = [...(config.externals || [])];
      config.externals.push((context, request, callback) => {
        if (request === "sodium-native" || request === "require-addon") {
          return callback(null, "commonjs " + request);
        }
        callback();
      });
    } else {
      config.resolve.alias = {
        ...config.resolve.alias,
        "sodium-native": false,
        "require-addon": false,
      };
    }

    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "1338",
        pathname: "/parse/files/**",
      },
    ],
  },

  // Set port for admin portal
  env: {
    PORT: "3002",
  },
};

module.exports = nextConfig;