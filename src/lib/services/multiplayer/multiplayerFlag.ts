/**
 * The switch for multiplayer (part 1, the shared base). A build turns it on with VUE_APP_MULTIPLAYER=true, and
 * .env.production does, so it is on in production. When the family server does not answer, the app shows the
 * road-not-open line. A development build also reads localStorage["xp:multiplayer"] = "on", so the shared dev
 * server needs no restart. With the flag off nothing is queued and nothing is sent.
 */

/** The development override */
export const MULTIPLAYER_OVERRIDE_KEY = "xp:multiplayer";

export interface MultiplayerFlagOptions {
  /** The build setting; defaults to VUE_APP_MULTIPLAYER. */
  env?: string;
  /** The development override; defaults to the localStorage value. */
  override?: string | null;
  /** Defaults to a production build. */
  production?: boolean;
}

function storedOverride(): string | null {
  try {
    return localStorage.getItem(MULTIPLAYER_OVERRIDE_KEY);
  } catch {
    return null;
  }
}

/** Whether multiplayer is on: the build flag anywhere, the localStorage override in development only. */
export function multiplayerEnabled(opts: MultiplayerFlagOptions = {}): boolean {
  const production = opts.production ?? process.env.NODE_ENV === "production";
  const env = "env" in opts ? opts.env : process.env.VUE_APP_MULTIPLAYER;
  const isOnInTheBuild = env === "true";
  if (isOnInTheBuild) return true;
  if (production) return false;
  const override = opts.override === undefined ? storedOverride() : opts.override;
  return override === "on";
}
