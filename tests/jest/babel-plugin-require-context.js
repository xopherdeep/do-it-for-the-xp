/* eslint-env node */
/**
 * Test-only Babel plugin (enabled through `env.test` in babel.config.json).
 *
 * webpack provides `require.context(dir, recursive?, regExp?)` at build time; Jest has no such
 * API. This rewrites every call site to
 *
 *   __requireContext(__dirname, dir, recursive?, regExp?)
 *
 * which is implemented in tests/jest/require-context.setup.js. The production build is
 * unaffected: `env.test` is never active for `vue-cli-service build`.
 */
module.exports = function requireContextPlugin({ types: t }) {
  return {
    name: "jest-require-context",
    visitor: {
      CallExpression(path) {
        const callee = path.node.callee;
        const isRequireContext =
          t.isMemberExpression(callee) &&
          !callee.computed &&
          t.isIdentifier(callee.object, { name: "require" }) &&
          t.isIdentifier(callee.property, { name: "context" }) &&
          !path.scope.hasBinding("require");
        if (isRequireContext) {
          path.node.callee = t.identifier("__requireContext");
          path.node.arguments.unshift(t.identifier("__dirname"));
        }
      },
    },
  };
};
