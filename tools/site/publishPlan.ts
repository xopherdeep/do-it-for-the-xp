export type Auth = { user: string; password: string };

// A non-2xx reply from the site: its status and `code` travel with the message.
export class WpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(`${status} ${code}: ${message}`);
    this.status = status;
    this.code = code;
  }
}

// WordPress answers 404 rest_template_not_found when the theme owning the template is not the active one.
export function isMissingTemplate(error: unknown): boolean {
  const isSiteError = error instanceof WpError;
  return isSiteError && error.status === 404 && error.code === "rest_template_not_found";
}

export function frontPageKept(settings: { show_on_front: string; page_on_front: number }, homeId: number): boolean {
  const showsPage = settings.show_on_front === "page";
  const pointsAtHome = settings.page_on_front === homeId;
  return showsPage && pointsAtHome;
}

const LOCAL_HOSTS = ["mycompass", "localhost", "127.0.0.1"];

export function pickAuth(site: string, env: Record<string, string>): Auth {
  const isLocal = LOCAL_HOSTS.includes(new URL(site).hostname);
  const prefix = isLocal ? "LOCAL_WP" : "DOIT_WP";
  const userKey = `${prefix}_USER`;
  const passwordKey = `${prefix}_APP_PASSWORD`;
  for (const key of [userKey, passwordKey]) {
    const isMissing = !env[key];
    if (isMissing) {
      throw new Error(`Missing ${key} in env file`);
    }
  }
  return { user: env[userKey], password: env[passwordKey] };
}

function stripQuotes(value: string): string {
  const quote = value[0];
  const isQuoteChar = quote === '"' || quote === "'";
  const isWrapped = value.length >= 2 && value.endsWith(quote);
  const isQuoted = isQuoteChar && isWrapped;
  if (isQuoted) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseEnvFile(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const isComment = line.trimStart().startsWith("#");
    const equalsAt = line.indexOf("=");
    const hasNoEquals = equalsAt < 0;
    const isNotAssignment = isComment || hasNoEquals;
    if (isNotAssignment) {
      continue;
    }
    const key = line.slice(0, equalsAt).trim();
    if (key) {
      result[key] = stripQuotes(line.slice(equalsAt + 1));
    }
  }
  return result;
}

export function statusQuery(): string {
  return "publish,draft,pending,private,future,trash";
}

export function planFrontPage(previousId: number, homeId: number): { draftPrevious: number | null } {
  const hasPrevious = previousId > 0;
  const isOtherPage = previousId !== homeId;
  const shouldDraft = hasPrevious && isOtherPage;
  return { draftPrevious: shouldDraft ? previousId : null };
}

export function linksToCheck(hrefs: string[], site: string): string[] {
  const links = new Set<string>();
  for (const href of hrefs) {
    const isSiteRelative = href.startsWith("/");
    const isAbsolute = /^https?:\/\//.test(href);
    if (isSiteRelative) {
      links.add(new URL(href, site).href);
    } else if (isAbsolute) {
      links.add(href);
    }
  }
  return [...links];
}

const shot = (name: string, alt: string) => ({ name, file: `.github/readme/${name}.jpg`, alt });

export const SCREENSHOTS: Array<{ name: string; file: string; alt: string }> = [
  shot("hometown", "Hometown map with the XP and GP guide"),
  shot("battle", "A chore beast approaches"),
  shot("victory", "Victory screen paying out XP, GP and AP"),
  shot("temple-map", "Wind Temple dungeon map"),
  shot("beast-log", "Beast Log, today's chores as beasts"),
  shot("boss", "A boss fight"),
  shot("small-key", "A small key found in a temple"),
  shot("my-home", "My Home"),
];
