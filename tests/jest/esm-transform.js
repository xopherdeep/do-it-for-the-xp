/* eslint-env node */
/**
 * Jest transform for the few node_modules packages that ship untranspiled ES modules with modern syntax
 * (three.js uses class static blocks, which the Babel preset here does not parse). TypeScript's emitter turns the
 * `import`/`export` into CommonJS and leaves the modern syntax alone, which the Node running the tests understands.
 */
const ts = require("typescript");

module.exports = {
  process(source, filename) {
    const { outputText } = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        allowJs: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        sourceMap: false,
        esModuleInterop: true,
      },
    });
    return outputText;
  },
};
