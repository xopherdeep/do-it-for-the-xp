#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const DEFAULT_DIST = path.join(ROOT_DIR, "dist");
const DEFAULT_OUT = path.join(ROOT_DIR, "dist-dlc");
const DEFAULT_IGNORE = path.join(ROOT_DIR, ".mobileignore");

const NATIVE_PUBLIC_DIRS = [
  path.join(ROOT_DIR, "android", "app", "src", "main", "assets", "public"),
  path.join(ROOT_DIR, "ios", "App", "App", "public"),
];

function printUsage() {
  console.log(`
Usage: node scripts/package-mobile-assets.mjs [options]

Options:
  --dry-run       Analyze dist/ against .mobileignore without writing or deleting files
  --pack-only     Package excluded assets into dist-dlc/ without pruning native dirs
  --prune-only    Prune excluded assets from native project dirs without creating dlc zip
  --dist <dir>    Path to built web directory (default: dist)
  --out <dir>     Path to output DLC package directory (default: dist-dlc)
  --ignore <file> Path to ignore rules file (default: .mobileignore)
  --help          Show this help message
`);
}

export function globToRegex(pattern) {
  let p = pattern.trim().replace(/\\/g, "/");
  if (p.startsWith("/")) p = p.slice(1);

  let res = "^";
  let inClass = false;

  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "*" && p[i + 1] === "*") {
      if (p[i + 2] === "/") {
        res += "(?:.+/)?";
        i += 2;
      } else {
        res += ".*";
        i++;
      }
    } else if (c === "*") {
      res += "[^/]*";
    } else if (c === "?") {
      res += "[^/]";
    } else if (["\\", ".", "+", "^", "$", "(", ")", "{", "}", "=", "!"].includes(c)) {
      res += "\\" + c;
    } else if (c === "[") {
      const closeIdx = p.indexOf("]", i);
      if (closeIdx > -1 && /^[a-zA-Z0-9]-[a-zA-Z0-9]$/.test(p.slice(i + 1, closeIdx))) {
        inClass = true;
        res += "[";
      } else {
        res += "\\[";
      }
    } else if (c === "]") {
      if (inClass) {
        inClass = false;
        res += "]";
      } else {
        res += "\\]";
      }
    } else {
      res += c;
    }
  }

  res += "$";
  return new RegExp(res);
}

export function loadIgnoreRules(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[mobile-assets] Warning: Ignore file not found at ${filePath}. No assets excluded.`);
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const rules = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    rules.push({
      pattern: trimmed,
      regex: globToRegex(trimmed),
    });
  }

  return rules;
}

export function walkDirectory(dir, base = "") {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = base ? path.posix.join(base, entry.name) : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDirectory(full, rel));
    } else if (entry.isFile()) {
      results.push(rel);
    }
  }
  return results;
}

function computeSha256(filePath) {
  const hash = crypto.createHash("sha256");
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest("hex");
}

function cleanEmptyDirectories(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      cleanEmptyDirectories(path.join(dir, entry.name));
    }
  }
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0) {
    fs.rmdirSync(dir);
  }
}

function getAppVersion() {
  const pkgPath = path.join(ROOT_DIR, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return pkg.version || "0.0.0";
    } catch {
      return "0.0.0";
    }
  }
  return "0.0.0";
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const isDryRun = args.includes("--dry-run");
  const isPackOnly = args.includes("--pack-only");
  const isPruneOnly = args.includes("--prune-only");

  let distDir = DEFAULT_DIST;
  let outDir = DEFAULT_OUT;
  let ignorePath = DEFAULT_IGNORE;

  const distIdx = args.indexOf("--dist");
  if (distIdx > -1 && args[distIdx + 1]) distDir = path.resolve(args[distIdx + 1]);

  const outIdx = args.indexOf("--out");
  if (outIdx > -1 && args[outIdx + 1]) outDir = path.resolve(args[outIdx + 1]);

  const ignoreIdx = args.indexOf("--ignore");
  if (ignoreIdx > -1 && args[ignoreIdx + 1]) ignorePath = path.resolve(args[ignoreIdx + 1]);

  const shouldPack = !isPruneOnly;
  const shouldPrune = !isPackOnly && !isDryRun;

  console.log(`[mobile-assets] Target dist:   ${path.relative(ROOT_DIR, distDir)}`);
  console.log(`[mobile-assets] Rules file:    ${path.relative(ROOT_DIR, ignorePath)}`);
  if (shouldPack) console.log(`[mobile-assets] Output DLC:    ${path.relative(ROOT_DIR, outDir)}`);

  if (!fs.existsSync(distDir)) {
    console.error(`[mobile-assets] Error: dist directory "${distDir}" does not exist. Run build first.`);
    process.exit(1);
  }

  const rules = loadIgnoreRules(ignorePath);
  console.log(`[mobile-assets] Loaded ${rules.length} exclusion patterns.`);

  const allFiles = walkDirectory(distDir);
  const matchedFiles = [];
  const keptFiles = [];

  let matchedBytes = 0;
  let keptBytes = 0;

  for (const rel of allFiles) {
    const full = path.join(distDir, rel);
    const size = fs.statSync(full).size;
    const isExcluded = rules.some((r) => r.regex.test(rel));

    if (isExcluded) {
      matchedFiles.push({ rel, full, size });
      matchedBytes += size;
    } else {
      keptFiles.push({ rel, full, size });
      keptBytes += size;
    }
  }

  const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

  console.log("\n[mobile-assets] Asset Breakdown:");
  console.log(`  Total dist files:     ${allFiles.length} (${mb(matchedBytes + keptBytes)} MB)`);
  console.log(`  Excluded from mobile: ${matchedFiles.length} (${mb(matchedBytes)} MB)`);
  console.log(`  Kept in mobile APK:   ${keptFiles.length} (${mb(keptBytes)} MB)`);

  if (isDryRun) {
    console.log("\n[mobile-assets] Dry run complete. No files created or removed.");
    return;
  }

  if (shouldPack) {
    console.log(`\n[mobile-assets] Packaging DLC assets to ${path.relative(ROOT_DIR, outDir)}...`);
    const assetsStagingDir = path.join(outDir, "assets");
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(assetsStagingDir, { recursive: true });

    const manifestFiles = [];

    for (const item of matchedFiles) {
      const targetPath = path.join(assetsStagingDir, item.rel);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(item.full, targetPath);

      const hash = computeSha256(item.full);
      manifestFiles.push({
        path: item.rel,
        size: item.size,
        sha256: hash,
      });
    }

    const version = getAppVersion();
    const manifest = {
      version,
      generatedAt: new Date().toISOString(),
      totalFiles: manifestFiles.length,
      totalBytes: matchedBytes,
      bundle: "assets-bundle.zip",
      files: manifestFiles,
    };

    const manifestPath = path.join(outDir, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    console.log(`  Created manifest: ${manifestPath} (${manifestFiles.length} items)`);

    const zipName = "assets-bundle.zip";
    const zipPath = path.join(outDir, zipName);

    try {
      execFileSync("zip", ["-1", "-rq", path.resolve(zipPath), "."], {
        cwd: assetsStagingDir,
        stdio: "inherit",
      });
      const zipSize = fs.statSync(zipPath).size;
      console.log(`  Created archive:  ${zipPath} (${mb(zipSize)} MB compressed)`);
    } catch (err) {
      console.error(`[mobile-assets] Failed to create zip via system command: ${err.message}`);
      process.exit(1);
    }
  }

  if (shouldPrune) {
    console.log("\n[mobile-assets] Pruning excluded assets from native project directories...");
    for (const targetPublic of NATIVE_PUBLIC_DIRS) {
      if (!fs.existsSync(targetPublic)) {
        console.log(`  Skipping non-existent target: ${path.relative(ROOT_DIR, targetPublic)}`);
        continue;
      }

      console.log(`  Scanning native public: ${path.relative(ROOT_DIR, targetPublic)}...`);
      const nativeFiles = walkDirectory(targetPublic);
      let prunedCount = 0;
      let prunedBytes = 0;

      for (const rel of nativeFiles) {
        const isExcluded = rules.some((r) => r.regex.test(rel));
        if (isExcluded) {
          const full = path.join(targetPublic, rel);
          prunedBytes += fs.statSync(full).size;
          fs.unlinkSync(full);
          prunedCount++;
        }
      }

      cleanEmptyDirectories(targetPublic);
      console.log(`  Pruned ${prunedCount} files (${mb(prunedBytes)} MB freed) from ${path.relative(ROOT_DIR, targetPublic)}.`);
    }
  }

  console.log("\n[mobile-assets] Finished successfully.");
}

main().catch((err) => {
  console.error("[mobile-assets] Error:", err);
  process.exit(1);
});
