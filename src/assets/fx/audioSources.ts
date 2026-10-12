import { remoteSong } from "@/lib/engine/audio/remoteBgm";

// Our own soundtrack (tools/chiptune renders it): the remote starmen.net tracks sit behind a bot
// challenge since 2026-10, so every slot plays a local loop. OGG loops gaplessly in Chrome and
// Android; MP3 is the fallback for Safari and iOS.
const chiptune = require.context("@/assets/audio/chiptune", false, /\.(ogg|mp3)$/);
const canPlayOgg =
  typeof document !== "undefined" && !!document.createElement("audio").canPlayType("audio/ogg; codecs=vorbis");
export const tune = (name: string): string => chiptune(`./${name}.${canPlayOgg ? "ogg" : "mp3"}`);
// Short stings rendered by tools/chiptune/stings.py
const stingFiles = require.context("@/assets/audio/chiptune/sfx", false, /\.(ogg|mp3)$/);
export const sting = (name: string): string => stingFiles(`./${name}.${canPlayOgg ? "ogg" : "mp3"}`);
// Produced songs stream from R2 (remoteBgm.ts); each one falls back to the chiptune loop of its slot
export const song = (name: string, fallback: string): string => remoteSong(name, tune(fallback));
