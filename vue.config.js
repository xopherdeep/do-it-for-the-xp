/**
 * Vue CLI Configuration
 * 
 * Build and dev-server settings for the Ionic app.
 */

module.exports = {
  // Configure for Ionic
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',

  // XP_OUTPUT_DIR redirects the build, e.g. into the COMPASS XP plugin's public/dist (`pnpm build:compass`)
  outputDir: process.env.XP_OUTPUT_DIR || 'dist',

  // Keep superseded art out of the bundle. TempleGrounds.ts requires
  // `@/assets/images/backgrounds/${temple}/${xy}.webp`, which webpack turns into an implicit,
  // recursive context over the whole backgrounds folder, so it would also emit the `ai/` and
  // `old/` drafts (.gitignore marks backgrounds/ai, backgrounds/old and backgrounds/gaia as
  // local-only) and wind-temple/old/. No code requests those keys, so drop them from every context.
  configureWebpack: {
    plugins: [
      {
        apply(compiler) {
          new compiler.webpack.IgnorePlugin({
            resourceRegExp: /^\.\/(?:.+\/)?(?:ai|old|gaia)\//,
            contextRegExp: /assets[\\/]images[\\/]backgrounds[\\/]?$/
          }).apply(compiler);
        }
      }
    ]
  },

  // Proxy API requests in development
  devServer: {
    hot: true,
    liveReload: true,
    
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true
      }
    },
    // Add explicit configuration for the error overlay
    client: {
      overlay: {
        errors: true,
        warnings: false
      }
    }
  }
};