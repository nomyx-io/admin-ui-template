/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

  webpack: (config, { isServer }) => {
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