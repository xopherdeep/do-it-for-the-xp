// Publishes the Do It For The XP front page to a WordPress site over the REST API.
// node tools/site/publish-doit.ts --site <url> [--dry-run] [--rollback] [--env-file <path>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkMarkup, collectHrefs, findPlaceholders, renderMarkup } from "./markup.ts";
import {
  frontPageKept, isMissingTemplate, linksToCheck, parseEnvFile, pickAuth, planFrontPage, SCREENSHOTS, statusQuery, WpError,
} from "./publishPlan.ts";
import type { Auth } from "./publishPlan.ts";

const SITE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SITE_DIR, "../..");
const PAGE_FILE = join(SITE_DIR, "doit-front-page.html");
const TEMPLATE_FILE = join(SITE_DIR, "front-page-template.html");
const REPORT_FILE = join(SITE_DIR, ".doit-publish-report.json");
const DEFAULT_ENV_FILE = resolve(REPO_ROOT, "../Xophz-COMPASS/.env.local");
const APP_URL = "https://app.doit.forthexp.com";
const HOME_SLUG = "home";
const SITE_TITLE = "Do It For The XP";
const SITE_DESCRIPTION = "A family chore app that plays like a SNES-era RPG.";
const TEMPLATE_THEME = "xophz-magic-hat";
const TEMPLATE_SLUG = "front-page";
const TEMPLATE_TITLE = "Front Page";
const TEMPLATE_ROUTE = `/wp/v2/templates/${TEMPLATE_THEME}//${TEMPLATE_SLUG}`;
const LINK_TIMEOUT_MS = 15000;
const USAGE = "Usage: node tools/site/publish-doit.ts --site <url> [--dry-run] [--rollback] [--env-file <path>]";

type SiteAuth = Auth & { site: string };
type Shot = (typeof SCREENSHOTS)[number];
type Media = { id: number; url: string };
type NamedMedia = Media & { name: string };
type MediaStep = NamedMedia & { action: "reused" | "uploaded" | "would upload" };
type Settings = { show_on_front: string; page_on_front: number };
type LinkResult = { href: string; status: number };
type Options = { site: string; dryRun: boolean; rollback: boolean; envFile: string };
type Report = {
  site: string;
  at: string;
  previousShowOnFront: string;
  previousFrontPage: number | null;
  page: { id: number; url: string };
  template: { id: string };
  media: Record<string, Media>;
  links: LinkResult[];
};

const say = (line: string) => process.stdout.write(`${line}\n`);
const row = (label: string, text: string) => say(`${label.padEnd(9)} ${text}`);
const mediaSlug = (name: string) => `doit-shot-${name}`;

// ---- flags, env file, screenshots ----

function valueAfter(args: string[], index: number): string {
  const value = args[index + 1];
  const isMissing = value === undefined || value.startsWith("--");
  if (isMissing) {
    throw new Error(`${args[index]} needs a value\n${USAGE}`);
  }
  return value;
}

function readOptions(args: string[]): Options {
  const options: Options = {
    site: "",
    dryRun: false,
    rollback: false,
    envFile: process.env.DOIT_WP_ENV_FILE || DEFAULT_ENV_FILE,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--site":
        options.site = valueAfter(args, i).replace(/\/+$/, "");
        i += 1;
        break;
      case "--env-file":
        options.envFile = resolve(valueAfter(args, i));
        i += 1;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--rollback":
        options.rollback = true;
        break;
      default:
        throw new Error(`Unknown option ${args[i]}\n${USAGE}`);
    }
  }
  const siteIsUrl = /^https?:\/\/[^/]/.test(options.site);
  if (!siteIsUrl) {
    throw new Error(`--site <url> is required, for example https://doit.forthexp.com\n${USAGE}`);
  }
  const asksBoth = options.dryRun && options.rollback;
  if (asksBoth) {
    throw new Error("--dry-run and --rollback cannot be used together");
  }
  return options;
}

function checkShotFiles(): void {
  const missing = SCREENSHOTS.filter((shot) => !existsSync(join(REPO_ROOT, shot.file)));
  const hasMissing = missing.length > 0;
  if (hasMissing) {
    throw new Error(`Missing screenshot file: ${missing.map((shot) => shot.file).join(", ")}`);
  }
}

// ---- REST ----

function basicHeader(auth: Auth): string {
  return `Basic ${Buffer.from(`${auth.user}:${auth.password}`).toString("base64")}`;
}

function parseJsonOrNull(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readReply<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = parseJsonOrNull(text);
  if (!res.ok) {
    const code = data?.code ?? "http_error";
    const message = data?.message ?? text.slice(0, 200);
    throw new WpError(res.status, code, message);
  }
  const isNotJson = data === null;
  if (isNotJson) {
    throw new WpError(res.status, "not_json", "the site did not answer with JSON");
  }
  return data as T;
}

function reasonOf(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  const hasCause = cause instanceof Error;
  if (hasCause) {
    return cause.message;
  }
  return error instanceof Error ? error.message : String(error);
}

// Never follow a redirect: a 301/302 would turn a POST into a GET that answers 200 and reads as success.
async function send(auth: SiteAuth, method: string, path: string, headers: Record<string, string>, body?: BodyInit): Promise<Response> {
  try {
    return await fetch(`${auth.site}/wp-json${path}`, { method, headers, body, redirect: "error" });
  } catch (error) {
    throw new Error(`${method} ${path} failed: ${reasonOf(error)}`);
  }
}

async function rest<T = unknown>(auth: SiteAuth, method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Authorization: basicHeader(auth), Accept: "application/json" };
  const hasBody = body !== undefined;
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  const res = await send(auth, method, path, headers, hasBody ? JSON.stringify(body) : undefined);
  return readReply<T>(res);
}

async function restForm<T = unknown>(auth: SiteAuth, path: string, form: FormData): Promise<T> {
  const headers = { Authorization: basicHeader(auth), Accept: "application/json" };
  const res = await send(auth, "POST", path, headers, form);
  return readReply<T>(res);
}

async function checkAuth(auth: SiteAuth): Promise<void> {
  const me = await rest<{ name: string; roles: string[] }>(auth, "GET", "/wp/v2/users/me?context=edit");
  row("account", `${me.name} (${me.roles.join(", ")})`);
}

// ---- media ----

function standInMedia(site: string, shot: Shot): Media {
  return { id: 0, url: `${site}/wp-content/uploads/${mediaSlug(shot.name)}.jpg` };
}

async function uploadMedia(auth: SiteAuth, shot: Shot): Promise<Media> {
  const slug = mediaSlug(shot.name);
  const form = new FormData();
  const bytes = new Uint8Array(readFileSync(join(REPO_ROOT, shot.file)));
  form.append("file", new Blob([bytes], { type: "image/jpeg" }), `${slug}.jpg`);
  form.append("title", shot.alt);
  form.append("slug", slug);
  form.append("alt_text", shot.alt);
  const made = await restForm<{ id: number; source_url: string }>(auth, "/wp/v2/media", form);
  return { id: made.id, url: made.source_url };
}

async function ensureMedia(auth: SiteAuth, shot: Shot, dryRun: boolean): Promise<MediaStep> {
  const found = await rest<Array<{ id: number; source_url: string }>>(
    auth, "GET", `/wp/v2/media?slug=${mediaSlug(shot.name)}&per_page=1`);
  const existing = found[0];
  if (existing) {
    return { name: shot.name, id: existing.id, url: existing.source_url, action: "reused" };
  }
  if (dryRun) {
    return { name: shot.name, ...standInMedia(auth.site, shot), action: "would upload" };
  }
  return { name: shot.name, ...(await uploadMedia(auth, shot)), action: "uploaded" };
}

async function ensureAllMedia(auth: SiteAuth, dryRun: boolean): Promise<MediaStep[]> {
  const steps: MediaStep[] = [];
  for (const shot of SCREENSHOTS) {
    steps.push(await ensureMedia(auth, shot, dryRun));
  }
  return steps;
}

// ---- the page markup ----

function pageVars(media: NamedMedia[]): Record<string, string> {
  const vars: Record<string, string> = { app: APP_URL };
  for (const item of media) {
    vars[`media:${item.name}`] = item.url;
    vars[`media-id:${item.name}`] = String(item.id);
  }
  return vars;
}

function assertCleanMarkup(html: string): void {
  const leftovers = findPlaceholders(html).map((key) => `placeholder {{${key}}}`);
  const problems = [...new Set([...leftovers, ...checkMarkup(html)])];
  const hasProblems = problems.length > 0;
  if (hasProblems) {
    throw new Error(`The page markup has problems, nothing was written:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
}

function renderPage(media: NamedMedia[]): string {
  const html = renderMarkup(readFileSync(PAGE_FILE, "utf8"), pageVars(media));
  assertCleanMarkup(html);
  return html;
}

// ---- writes ----

async function upsertPage(auth: SiteAuth, slug: string, title: string, html: string): Promise<{ id: number; action: "created" | "updated" }> {
  const found = await rest<Array<{ id: number }>>(auth, "GET", `/wp/v2/pages?slug=${slug}&status=${statusQuery()}&per_page=1`);
  const existing = found[0];
  const fields = { status: "publish", title, content: html, comment_status: "closed" };
  if (existing) {
    const updated = await rest<{ id: number }>(auth, "POST", `/wp/v2/pages/${existing.id}`, fields);
    return { id: updated.id, action: "updated" };
  }
  const created = await rest<{ id: number }>(auth, "POST", "/wp/v2/pages", { slug, ...fields });
  return { id: created.id, action: "created" };
}

// The id route creates an override only for the active theme; while Magic Hat is not active the id answers 404
// rest_template_not_found, and the first write goes once to the collection route (later writes find the post).
async function upsertTemplate(auth: SiteAuth): Promise<{ id: string; route: "id" | "collection" }> {
  const content = readFileSync(TEMPLATE_FILE, "utf8");
  try {
    const written = await rest<{ id: string }>(auth, "POST", TEMPLATE_ROUTE, { content, title: TEMPLATE_TITLE, status: "publish" });
    return { id: written.id, route: "id" };
  } catch (error) {
    const themeNotActive = isMissingTemplate(error);
    if (!themeNotActive) {
      throw error;
    }
  }
  const fields = { slug: TEMPLATE_SLUG, theme: TEMPLATE_THEME, content, title: TEMPLATE_TITLE, status: "publish" };
  const created = await rest<{ id: string }>(auth, "POST", "/wp/v2/templates", fields);
  return { id: created.id, route: "collection" };
}

async function writeSettings(auth: SiteAuth, homeId: number): Promise<void> {
  const kept = await rest<Settings>(auth, "POST", "/wp/v2/settings", {
    show_on_front: "page",
    page_on_front: homeId,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  });
  const wasKept = frontPageKept(kept, homeId);
  if (!wasKept) {
    throw new Error(`The site did not keep the front page (show_on_front=${kept.show_on_front}, page_on_front=${kept.page_on_front}, wanted page ${homeId})`);
  }
}

async function draftPrevious(auth: SiteAuth, previousId: number, homeId: number): Promise<number | null> {
  const { draftPrevious: toDraft } = planFrontPage(previousId, homeId);
  const nothingToDraft = toDraft === null;
  if (nothingToDraft) {
    return null;
  }
  await rest(auth, "POST", `/wp/v2/pages/${toDraft}`, { status: "draft" });
  return toDraft;
}

// ---- links ----

async function fetchStatus(href: string, method: "HEAD" | "GET"): Promise<number> {
  try {
    const res = await fetch(href, { method, redirect: "follow", signal: AbortSignal.timeout(LINK_TIMEOUT_MS) });
    await res.body?.cancel();
    return res.status;
  } catch {
    return 0;
  }
}

async function probe(href: string): Promise<number> {
  const status = await fetchStatus(href, "HEAD");
  const headNotAllowed = status === 405;
  return headNotAllowed ? fetchStatus(href, "GET") : status;
}

async function checkLinks(html: string, site: string, pageUrl: string): Promise<LinkResult[]> {
  const hrefs = new Set([pageUrl, ...linksToCheck(collectHrefs(html), site)]);
  const results: LinkResult[] = [];
  for (const href of hrefs) {
    results.push({ href, status: await probe(href) });
  }
  return results;
}

// ---- report ----

function readReport(): Report | null {
  const hasReport = existsSync(REPORT_FILE);
  return hasReport ? (JSON.parse(readFileSync(REPORT_FILE, "utf8")) as Report) : null;
}

function saveReport(report: Report): void {
  writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
}

// A second publish finds the home page already in front: keep what the first one remembered.
function rememberPrevious(settings: Settings, homeId: number, old: Report | null, site: string) {
  const alreadyHome = settings.page_on_front === homeId;
  const sameSite = old !== null && old.site === site;
  const keepOld = alreadyHome && sameSite;
  if (keepOld) {
    return { previousShowOnFront: old.previousShowOnFront, previousFrontPage: old.previousFrontPage };
  }
  const hasFrontPage = settings.page_on_front > 0;
  return { previousShowOnFront: settings.show_on_front, previousFrontPage: hasFrontPage ? settings.page_on_front : null };
}

// ---- the runs ----

function printPlan(site: string, steps: MediaStep[], html: string, settings: Settings): void {
  for (const step of steps) {
    row("media", `${step.name}: ${step.action}`);
  }
  row("page", `would create or update "${HOME_SLUG}" (publish, comments closed), ${html.length} characters of markup`);
  row("template", `would write ${TEMPLATE_THEME}//${TEMPLATE_SLUG} (through the collection route when the theme is not active yet)`);
  row("settings", `would set show_on_front=page, page_on_front=<home id>, title, description (now ${settings.show_on_front} / ${settings.page_on_front})`);
  const hasPrevious = settings.page_on_front > 0;
  if (hasPrevious) {
    row("previous", `would draft page ${settings.page_on_front} unless it is the home page`);
  }
  row("links", `would check ${linksToCheck(collectHrefs(html), site).length + 1} links after publishing`);
  say("Dry run: nothing was written.");
}

function printSummary(report: Report, steps: MediaStep[], page: string, templateRoute: string, drafted: number | null): void {
  const counts = (action: string) => steps.filter((step) => step.action === action).length;
  row("media", `${counts("uploaded")} uploaded, ${counts("reused")} reused`);
  row("page", `${page} (id ${report.page.id}) ${report.page.url}`);
  row("template", `written through the ${templateRoute} route (${report.template.id})`);
  row("settings", `front page is now page ${report.page.id} (was ${report.previousShowOnFront} / ${report.previousFrontPage ?? 0})`);
  row("previous", drafted === null ? "left as it was" : `page ${drafted} set to draft`);
  const broken = report.links.filter((link) => link.status !== 200);
  row("links", `${report.links.length} checked, ${broken.length} not 200`);
  for (const link of broken) {
    say(`          ${link.status === 0 ? "no answer" : link.status}  ${link.href}`);
  }
  row("report", REPORT_FILE);
}

async function publish(auth: SiteAuth, dryRun: boolean): Promise<void> {
  checkShotFiles();
  renderPage(SCREENSHOTS.map((shot) => ({ name: shot.name, ...standInMedia(auth.site, shot) })));
  await checkAuth(auth);
  const steps = await ensureAllMedia(auth, dryRun);
  const html = renderPage(steps);
  const settings = await rest<Settings>(auth, "GET", "/wp/v2/settings");
  if (dryRun) {
    printPlan(auth.site, steps, html, settings);
    return;
  }
  const page = await upsertPage(auth, HOME_SLUG, SITE_TITLE, html);
  const template = await upsertTemplate(auth);
  const remembered = rememberPrevious(settings, page.id, readReport(), auth.site);
  const report: Report = {
    site: auth.site,
    at: new Date().toISOString(),
    ...remembered,
    page: { id: page.id, url: `${auth.site}/` },
    template: { id: template.id },
    media: Object.fromEntries(steps.map((step) => [step.name, { id: step.id, url: step.url }])),
    links: [],
  };
  // Saved before the settings change: a lost or garbled reply to that POST must not lose the way back.
  saveReport(report);
  await writeSettings(auth, page.id);
  const drafted = await draftPrevious(auth, remembered.previousFrontPage ?? 0, page.id);
  report.links = await checkLinks(html, auth.site, report.page.url);
  saveReport(report);
  printSummary(report, steps, page.action, template.route, drafted);
  const anyLinkBroken = report.links.some((link) => link.status !== 200);
  if (anyLinkBroken) {
    process.exitCode = 1;
  }
}

async function rollback(auth: SiteAuth): Promise<void> {
  const report = readReport();
  const hasNoReport = report === null;
  if (hasNoReport) {
    throw new Error(`No publish report at ${REPORT_FILE}, nothing to roll back`);
  }
  const isOtherSite = report.site !== auth.site;
  if (isOtherSite) {
    throw new Error(`The report is for ${report.site}, not ${auth.site}`);
  }
  await checkAuth(auth);
  const previous = report.previousFrontPage;
  const hadFrontPage = previous !== null;
  if (hadFrontPage) {
    await rest(auth, "POST", `/wp/v2/pages/${previous}`, { status: "publish" });
    row("page", `${previous} published again`);
  }
  await rest(auth, "POST", "/wp/v2/settings", { show_on_front: report.previousShowOnFront, page_on_front: previous ?? 0 });
  row("settings", `show_on_front=${report.previousShowOnFront}, page_on_front=${previous ?? 0}`);
  say("The theme, the media and the home page were not touched. Switch the theme back in Appearance.");
}

export async function main(): Promise<void> {
  try {
    const options = readOptions(process.argv.slice(2));
    const credentials = pickAuth(options.site, parseEnvFile(readFileSync(options.envFile, "utf8")));
    const auth: SiteAuth = { ...credentials, site: options.site };
    if (options.rollback) {
      await rollback(auth);
    } else {
      await publish(auth, options.dryRun);
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

const hasEntryFile = Boolean(process.argv[1]);
const isEntryPoint = hasEntryFile && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  main();
}
