module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Add fallbacks
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };

      return webpackConfig;
    },
  },
  // Disable fast refresh entirely to avoid the react-refresh issues
  devServer: {
    hot: false,
    liveReload: true,
  },
};