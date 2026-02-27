const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  server: {
    host: '0.0.0.0', // Allow connections from any IP address
    port: 8081, // React Native's default Metro bundler port
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
