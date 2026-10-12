// The produced soundtrack streams from the R2 bucket `xp-bgm` (public, CORS open, cached a year).
// Every remote song names a bundled chiptune loop to play instead when it cannot load (offline, blocked).
export const BGM_CDN = "https://pub-89620c9706034c37924bd717c0bc6ea7.r2.dev/bgm";

const fallbacks = new Map<string, string>();

/** The URL of a song in the bucket, remembering the local loop that stands in for it. */
export function remoteSong(name: string, fallback: string): string {
  const url = `${BGM_CDN}/${name}.mp3`;
  fallbacks.set(url, fallback);
  return url;
}

/** The local stand-in for a remote song, or undefined for a track that is already local. */
export function fallbackFor(url: string): string | undefined {
  return fallbacks.get(url);
}
