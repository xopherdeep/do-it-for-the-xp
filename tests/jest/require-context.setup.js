/* eslint-env node */
/**
 * Jest `setupFiles` entry: implements the `__requireContext` global that
 * tests/jest/babel-plugin-require-context.js substitutes for webpack's `require.context`.
 *
 * Semantics follow webpack: `keys()` returns "./relative/path" keys of the files under the
 * directory that match the RegExp (default: recursive, every file), and calling the context with
 * a key requires that file. The "@/" alias maps to <repo>/src, like the jest preset's
 * moduleNameMapper and tsconfig paths.
 */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(__dirname, "..", "..", "src");

function resolveDirectory(callerDir, directory) {
  if (directory.startsWith("@/")) {
    return path.join(SRC_DIR, directory.slice(2));
  }
  return path.resolve(callerDir, directory);
}

function listFiles(dir, recursive, found = []) {
  if (!fs.existsSync(dir)) {
    return found;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        listFiles(full, recursive, found);
      }
    } else {
      found.push(full);
    }
  }
  return found;
}

global.__requireContext = function requireContext(
  callerDir,
  directory,
  useSubdirectories = true,
  regExp = /^\.\/.*$/
) {
  const base = resolveDirectory(callerDir, directory);
  let cachedKeys = null;

  const getKeys = () => {
    if (!cachedKeys) {
      cachedKeys = listFiles(base, useSubdirectories)
        .map((file) => "./" + path.relative(base, file).split(path.sep).join("/"))
        .filter((key) => {
          regExp.lastIndex = 0;
          return regExp.test(key);
        })
        .sort();
    }
    return cachedKeys;
  };

  const resolve = (key) => {
    if (!getKeys().includes(key)) {
      const error = new Error(`Cannot find module '${key}'`);
      error.code = "MODULE_NOT_FOUND";
      throw error;
    }
    return path.join(base, key);
  };

  const context = (key) => require(resolve(key));
  context.keys = () => getKeys().slice();
  context.resolve = resolve;
  context.id = base;
  return context;
};
