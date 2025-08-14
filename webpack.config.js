const webpack = require('webpack');

module.exports = function override(config, env) {
  // Fix for react-refresh trying to inject into node_modules
  config.module.rules.forEach(rule => {
    if (rule.oneOf) {
      rule.oneOf.forEach(oneOfRule => {
        if (
          oneOfRule.loader &&
          oneOfRule.loader.includes('babel-loader') &&
          oneOfRule.options &&
          oneOfRule.options.plugins
        ) {
          oneOfRule.options.plugins = oneOfRule.options.plugins.filter(
            plugin => !plugin.includes('react-refresh')
          );
        }
      });
    }
  });

  // Add fallback for node modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    os: false,
    path: false,
    crypto: false,
    stream: false,
    buffer: false,
  };

  // Add webpack plugins
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    })
  );

  return config;
};
