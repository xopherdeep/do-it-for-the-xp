/**
 * When WordPress hosts the app (xophz-compass-xp), the page is served at a permalink
 * while the build sits in the plugin's public/dist. The plugin sets
 * window.__XP_PUBLIC_PATH__ so lazy chunks and imported images and audio load from
 * there instead of from the permalink. Standalone and native builds leave it unset.
 *
 * This must stay the first import in main.ts: it has to run before any chunk loads.
 */
declare global {
  interface Window {
    __XP_PUBLIC_PATH__?: string;
  }
}

const hostedPublicPath = window.__XP_PUBLIC_PATH__;
const isHostedByWordPress = Boolean(hostedPublicPath);

if (isHostedByWordPress) {
  __webpack_public_path__ = hostedPublicPath as string;
}

export {};
