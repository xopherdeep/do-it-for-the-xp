// craco.config.js
const webpack = require('webpack');

module.exports = {
  style: {
    postcss: {
      plugins: [require("tailwindcss"), require("autoprefixer")],
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Define Vue feature flags
      const hasPlugins = Boolean(webpackConfig.plugins);
      if (!hasPlugins) {
        webpackConfig.plugins = [];
      }
      
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
          __VUE_PROD_DEVTOOLS__: 'true'
        })
      );
      
      return webpackConfig;
    }
  }
};
