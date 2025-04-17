/**
 * Vue CLI Configuration
 * 
 * This configuration file includes special settings for battleroom development
 * when running with the BATTLEROOM_DEV environment variable.
 */

// Import the battleroom-specific configuration when in development mode
const battleroomConfig = process.env.BATTLEROOM_DEV 
  ? require('./battleroom.config')
  : {};

module.exports = {
  // Configure for Ionic
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
  
  // Merge with battleroom config when in battleroom development mode
  ...battleroomConfig,
  
  // Proxy API requests in development
  devServer: {
    // Merge battleroom devServer settings if in battleroom dev mode
    ...(battleroomConfig.devServer || {}),
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
};