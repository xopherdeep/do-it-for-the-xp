/**
 * Image lookups by runtime key, kept as narrow as their consumers allow.
 *
 * A bare `require.context("@/assets/images/")` is recursive and matches every file, so webpack
 * emits ALL of src/assets/images (150+ MB) into dist/img whether or not anything displays it.
 * Give each context an explicit directory, `recursive` flag and RegExp. Images that are always
 * shown should be required directly (`require("@/assets/images/...")` or `url()` in SCSS), which
 * bundles just that one file.
 */

/**
 * Keys look like "./avatars/001-gamer.svg" (relative to src/assets/images/), the shape MyTask.ts
 * passes to `$requireImg`. Only the avatar SVGs are in this context; widen the RegExp (or require
 * the file directly) if another folder needs a runtime lookup.
 */
const requireImg = require.context("@/assets/images/", true, /^\.\/avatars\/[^/]+\.svg$/);

/** Keys look like "./001-gamer.svg" (relative to src/assets/images/avatars/). */
const requireAvatar = require.context("@/assets/images/avatars", false, /\.svg$/);

export { requireAvatar };
export default requireImg;
