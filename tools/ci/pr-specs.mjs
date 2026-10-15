#!/usr/bin/env node
// Usage: node tools/ci/pr-specs.mjs <base-rev> [--list]
// The pull request test step: runs only the jest specs that depend on what the PR changed, through
// `chemx test -- jest --findRelatedTests`. Pushes to master still run the whole suite (`chemx verify`),
// which catches anything this misses. Falls back to the whole suite when a change can affect every
// spec (dependencies, jest/ts/babel config, shared test setup, a deleted module), and runs nothing
// when no code changed (docs, art, audio). --list prints the plan without running jest.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const CHEMX = `chemx@${process.env.CHEMX_VERSION || "latest"}`;
const CODE = /\.(?:[cm]?[jt]sx?|vue|json)$/;
const SPEC = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
// Any of these can change how every spec compiles or runs.
const WHOLE_SUITE = [
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^\.npmrc$/,
  /^jest\.config\./,
  /^tsconfig[^/]*\.json$/,
  /^babel\.config\./,
  /^\.babelrc/,
  /^tests\/jest\//,
  /^tests\/unit\/(?!.*\.(?:spec|test)\.[cm]?[jt]sx?$)/,
  /^\.github\/workflows\/tests\.yml$/,
  /^tools\/ci\//,
];

const git = (args) => {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
};

const changedFiles = (base) =>
  git(["diff", "--name-status", "--no-renames", base, "HEAD", "--"])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, file] = line.split("\t");
      return { status: status[0], file };
    });

// A page's .vue pulls its sibling .ts and .scss in with `<script src>` / `<style src>`, which jest's
// dependency graph doesn't see, so a change to either also counts as a change to the .vue beside it.
const siblingVues = (file) => {
  const dir = path.dirname(file);
  if (!existsSync(dir)) return [];
  const stem = path.basename(file).replace(/\.[^.]+$/, "").replace(/^_/, "");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".vue") && name.replace(/\.vue$/, "") === stem)
    .map((name) => path.join(dir, name));
};

export const planSpecs = (changes) => {
  const wholeSuite = changes.find(({ file }) => WHOLE_SUITE.some((re) => re.test(file)));
  if (wholeSuite) return { mode: "full", reason: `${wholeSuite.file} changed (affects every spec)` };
  const deleted = changes.find(({ status, file }) => status === "D" && file.startsWith("src/") && CODE.test(file));
  if (deleted) return { mode: "full", reason: `${deleted.file} was deleted (its importers can't be traced)` };
  const live = changes.filter(({ status }) => status !== "D").map(({ file }) => file);
  const related = new Set();
  for (const file of live) {
    const isSource = file.startsWith("src/") && (CODE.test(file) || /\.s?css$/.test(file));
    const isSpec = file.startsWith("tests/") && SPEC.test(file);
    if (isSource && CODE.test(file)) related.add(file);
    if (isSource) siblingVues(file).forEach((vue) => related.add(vue));
    if (isSpec) related.add(file);
  }
  if (related.size === 0) return { mode: "none", reason: `no source or spec changed in ${changes.length} file(s)` };
  return { mode: "related", reason: `${related.size} changed source/spec file(s)`, files: [...related].sort() };
};

const run = (args) => spawnSync("npx", ["--yes", CHEMX, "test", ...args], { stdio: "inherit" }).status ?? 1;

const main = () => {
  const [base, flag] = process.argv.slice(2);
  if (!base) {
    console.error("usage: node tools/ci/pr-specs.mjs <base-rev> [--list]");
    return 2;
  }
  const plan = planSpecs(changedFiles(base));
  console.log(`Specs: ${plan.mode} (${plan.reason})`);
  if (plan.files) plan.files.forEach((file) => console.log(`  ${file}`));
  if (flag === "--list" || plan.mode === "none") return 0;
  if (plan.mode === "full") return run([]);
  return run(["--allow-empty", "--", "jest", "--passWithNoTests", "--findRelatedTests", ...plan.files]);
};

process.exit(main());
