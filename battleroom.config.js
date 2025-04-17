/**
 * Battleroom Build Configuration
 * 
 * This file contains custom webpack configuration for battleroom development
 * and builds. It's used when running with the BATTLEROOM_DEV environment variable.
 */

module.exports = {
  devServer: {
    // Enable hot reloading specifically for battleroom components
    hot: true,
    // Make the build process faster for battleroom development
    liveReload: true
  },
  
  // Optimize build for battleroom development
  configureWebpack: {
    // Custom entry point that focuses on battleroom code
    entry: process.env.BATTLEROOM_DEV ? './src/views/Dev/BattleroomDevTools/main-battleroom.ts' : undefined,
    
    // Add source maps for better debugging
    devtool: process.env.BATTLEROOM_DEV ? 'source-map' : undefined,
    
    // Optimize build for faster loading of battleroom components
    optimization: {
      splitChunks: {
        cacheGroups: {
          battleroom: {
            name: 'battleroom',
            test: /[\\/]src[\\/]views[\\/]MyPortal[\\/]HomeTown[\\/]BattleGround[\\/]/,
            chunks: 'all',
            priority: 10
          }
        }
      }
    }
  }
};