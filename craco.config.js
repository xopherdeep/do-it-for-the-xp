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
      if (!webpackConfig.plugins) {
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
