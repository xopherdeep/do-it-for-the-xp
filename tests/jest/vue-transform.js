/* eslint-env node */
/**
 * vue3-jest with a cache key that covers `src=` blocks. vue3-jest keys its cache on the .vue file alone, so a page
 * whose `<script src="./Page.ts">` changed kept running the old compiled script until `jest --clearCache`. CI keeps
 * the jest cache between runs, so the key has to change whenever a referenced file does.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vueJest = require("@vue/vue3-jest");

const SRC_ATTR = /<(?:script|template|style)\b[^>]*\bsrc=["']([^"']+)["']/g;

module.exports = {
  ...vueJest,
  getCacheKey(fileData, filename, options) {
    const hash = crypto.createHash("md5").update(vueJest.getCacheKey(fileData, filename, options));
    for (const [, src] of fileData.matchAll(SRC_ATTR)) {
      const file = path.resolve(path.dirname(filename), src);
      hash.update(src);
      hash.update(fs.existsSync(file) ? fs.readFileSync(file) : "missing");
    }
    return hash.digest("hex");
  },
};
