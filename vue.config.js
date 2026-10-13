/**
 * Vue CLI Configuration
 *
 * Build and dev-server settings for the Ionic app. Speed-ups sit behind env flags (flag=0 turns one off):
 * XP_FS_CACHE, XP_DEV_LINT, XP_DEV_TYPECHECK, XP_SASS_MODERN, XP_DEV_ESBUILD default ON; XP_LAZY defaults OFF.
 * tools/bench/build-bench.sh measures them.
 */
process.env.VUE_APP_VERSION = require("./package.json").version;
const fs = require('fs');
const path = require('path');

// esbuild marks destructuring unlowerable for safari14/ios14 (known WebKit 14 bug); chrome79 etc. are fine. Keep 14 and force-allow it.
const target = ['chrome79', 'edge79', 'firefox70', 'safari14', 'ios14'];
const supported = { destructuring: true };

// tsconfig target is esnext, so class fields use define semantics (TS default for ESNext).
const tsconfigRaw = {
  compilerOptions: {
    target: 'esnext',
    useDefineForClassFields: true,
    importsNotUsedAsValues: 'remove',
    jsx: 'preserve'
  }
};

function useEsbuild(rule, options) {
  rule.uses.clear();
  rule
    .use('esbuild-loader')
    .loader(require.resolve('esbuild-loader'))
    .options(options)
    .end();
}

const flag = (name, def) => {
  const v = process.env[name];
  return v === undefined || v === '' ? def : v !== '0' && v !== 'false';
};
const isProd = process.env.NODE_ENV === 'production';
const mode = isProd ? 'production' : 'development';

const FS_CACHE = flag('XP_FS_CACHE', true);
const DEV_LINT = flag('XP_DEV_LINT', true);
const DEV_TYPECHECK = flag('XP_DEV_TYPECHECK', true);
const SASS_MODERN = flag('XP_SASS_MODERN', true);
const DEV_ESBUILD = flag('XP_DEV_ESBUILD', true);
const LAZY = flag('XP_LAZY', false);

const sassOptions = SASS_MODERN
  ? { api: 'modern-compiler', implementation: require('sass-embedded') }
  : undefined;

module.exports = {
  // Configure for Ionic
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',

  // Never publish source maps: they hand out the private source
  productionSourceMap: false,

  // XP_OUTPUT_DIR redirects the build, e.g. into the COMPASS XP plugin's public/dist (`pnpm build:compass`)
  outputDir: process.env.XP_OUTPUT_DIR || 'dist',

  // Dev only: skip ESLint on save, the owner lints with `chemx lint` (production keeps Vue CLI's default)
  ...(!isProd && DEV_LINT ? { lintOnSave: false } : {}),

  // Sass modern compiler API on the embedded (native) Dart Sass is much faster than the legacy JS API
  ...(sassOptions ? { css: { loaderOptions: { scss: sassOptions, sass: sassOptions } } } : {}),

  chainWebpack: config => {
    // Static <title> for crawlers and link previews (they do not run JS); the default is the package name.
    // main.ts still sets document.title per route.
    config.plugin('html').tap(args => {
      args[0].title = 'Do It For The XP';
      return args;
    });

    // Dev only: drop the fork-ts-checker type pass from the dev build, `chemx typecheck` covers it (production keeps it)
    if (!isProd && DEV_TYPECHECK) config.plugins.delete('fork-ts-checker');

    // Dev only: esbuild-loader instead of babel-loader + ts-loader (+ thread-loader), about 40% faster cold start.
    // Production keeps Vue CLI's babel/ts-loader and terser: esbuild adds no core-js polyfills and grows chunk-vendors.
    // Targets mirror .browserslistrc (Chrome/Edge 79, Firefox 70, Safari/iOS 14); Safari 14 has no Array.prototype.at.
    // .vue <script lang="ts"> blocks are routed by vue-loader through these same rules,
    // so no appendTsSuffixTo equivalent is needed (esbuild's `loader` option is explicit).
    if (!isProd && DEV_ESBUILD) {
      useEsbuild(config.module.rule('js'), { loader: 'js', target, supported });
      useEsbuild(config.module.rule('ts'), { loader: 'ts', target, supported, tsconfigRaw });
      useEsbuild(config.module.rule('tsx'), { loader: 'tsx', target, supported, tsconfigRaw });
    }
  },

  // Keep superseded art out of the bundle. TempleGrounds.ts requires
  // `@/assets/images/backgrounds/${temple}/${xy}.webp`, which webpack turns into an implicit,
  // recursive context over the whole backgrounds folder, so it would also emit the `ai/` and
  // `old/` drafts (.gitignore marks backgrounds/ai, backgrounds/old and backgrounds/gaia as
  // local-only) and wind-temple/old/. No code requests those keys, so drop them from every context.
  configureWebpack: {
    // Webpack 5 persistent disk cache makes warm rebuilds and restarts much faster; one cache per mode
    ...(FS_CACHE ? {
      cache: {
        type: 'filesystem',
        name: mode,
        buildDependencies: {
          config: [
            __filename,
            ...['babel.config.json', 'tsconfig.json', 'postcss.config.js', 'tailwind.config.js']
              .map(f => path.resolve(__dirname, f))
              .filter(f => fs.existsSync(f))
          ]
        }
      }
    } : {}),

    // Dev only: compile lazy route chunks on first request (needs a real browser check under Ionic's router; default off)
    ...(!isProd && LAZY ? { experiments: { lazyCompilation: { entries: false, imports: true } } } : {}),

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