// The produced soundtrack streams from the R2 bucket `xp-bgm` (public, CORS open, cached a year).
// Every remote song names a bundled chiptune loop to play instead when it cannot load (offline, blocked).
export const BGM_CDN = "https://pub-89620c9706034c37924bd717c0bc6ea7.r2.dev/bgm";

// The same song can sit in several BGM slots, each with its own chiptune stand-in, so the stand-in
// travels inside the track string: a URL fragment, which the browser never sends and the CDN cache ignores.
const FALLBACK_MARK = "#fallback=";

/** A song in the bucket, tagged with the local loop that stands in for it in this slot. */
export function remoteSong(name: string, fallback: string): string {
  return `${BGM_CDN}/${name}.mp3${FALLBACK_MARK}${encodeURIComponent(fallback)}`;
}

/** The URL to fetch for a track: the bucket URL itself, without the slot's fallback tag. */
export function streamUrl(track: string): string {
  const mark = track.indexOf(FALLBACK_MARK);
  return mark < 0 ? track : track.slice(0, mark);
}

/** The local stand-in for a remote song, or undefined for a track that is already local. */
export function fallbackFor(track: string): string | undefined {
  const mark = track.indexOf(FALLBACK_MARK);
  return mark < 0 ? undefined : decodeURIComponent(track.slice(mark + FALLBACK_MARK.length));
}
