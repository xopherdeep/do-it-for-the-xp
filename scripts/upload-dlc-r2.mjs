#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const DEFAULT_DLC_DIR = path.join(ROOT_DIR, "dist-dlc");
const DEFAULT_BUCKET = "xp-bgm";
const DEFAULT_PREFIX = "dlc";

function printUsage() {
  console.log(`
Usage: node scripts/upload-dlc-r2.mjs [options]

Options:
  --bucket <name>   R2 bucket name (default: xp-bgm)
  --prefix <path>   Destination prefix in bucket (default: dlc)
  --dlc-dir <dir>   Path to local DLC artifacts (default: dist-dlc)
  --dry-run         List upload operations without calling wrangler
  --help            Show this help message
`);
}

function walkDirectory(dir, base = "") {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = base ? path.posix.join(base, entry.name) : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDirectory(full, rel));
    } else if (entry.isFile()) {
      results.push({ rel, full, size: fs.statSync(full).size });
    }
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const isDryRun = args.includes("--dry-run");

  let bucket = DEFAULT_BUCKET;
  let prefix = DEFAULT_PREFIX;
  let dlcDir = DEFAULT_DLC_DIR;

  const bucketIdx = args.indexOf("--bucket");
  if (bucketIdx > -1 && args[bucketIdx + 1]) bucket = args[bucketIdx + 1];

  const prefixIdx = args.indexOf("--prefix");
  if (prefixIdx > -1 && args[prefixIdx + 1]) prefix = args[prefixIdx + 1];

  const dirIdx = args.indexOf("--dlc-dir");
  if (dirIdx > -1 && args[dirIdx + 1]) dlcDir = path.resolve(args[dirIdx + 1]);

  console.log(`[upload-r2] Source directory: ${path.relative(ROOT_DIR, dlcDir)}`);
  console.log(`[upload-r2] Target bucket:    ${bucket}/${prefix}`);

  const manifestPath = path.join(dlcDir, "manifest.json");
  const zipPath = path.join(dlcDir, "assets-bundle.zip");
  const assetsDir = path.join(dlcDir, "assets");

  if (!fs.existsSync(manifestPath)) {
    console.error(`[upload-r2] Error: manifest.json not found in "${dlcDir}". Run pnpm assets:pack first.`);
    process.exit(1);
  }

  const uploadItems = [];

  if (fs.existsSync(manifestPath)) {
    uploadItems.push({
      key: `${prefix}/manifest.json`,
      full: manifestPath,
      size: fs.statSync(manifestPath).size,
    });
  }

  if (fs.existsSync(zipPath)) {
    uploadItems.push({
      key: `${prefix}/assets-bundle.zip`,
      full: zipPath,
      size: fs.statSync(zipPath).size,
    });
  }

  if (fs.existsSync(assetsDir)) {
    const assets = walkDirectory(assetsDir);
    for (const item of assets) {
      uploadItems.push({
        key: `${prefix}/${item.rel}`,
        full: item.full,
        size: item.size,
      });
    }
  }

  const totalBytes = uploadItems.reduce((acc, curr) => acc + curr.size, 0);
  const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

  console.log(`[upload-r2] Prepared ${uploadItems.length} files (${mb(totalBytes)} MB) for R2 upload.`);

  if (isDryRun) {
    console.log("\n[upload-r2] Dry run complete. Sample uploads:");
    for (const item of uploadItems.slice(0, 10)) {
      console.log(`  ${item.key} (${item.size} bytes)`);
    }
    return;
  }

  let uploadedCount = 0;
  for (const item of uploadItems) {
    console.log(`  Uploading [${uploadedCount + 1}/${uploadItems.length}]: ${item.key}...`);
    try {
      execFileSync("npx", [
        "--yes",
        "wrangler@4",
        "r2",
        "object",
        "put",
        `${bucket}/${item.key}`,
        `--file=${item.full}`,
        "--remote",
      ], {
        stdio: "pipe",
      });
      uploadedCount += 1;
    } catch (err) {
      console.error(`[upload-r2] Failed to upload ${item.key}: ${err.message}`);
    }
  }

  console.log(`\n[upload-r2] Finished. Uploaded ${uploadedCount}/${uploadItems.length} objects.`);
}

main().catch((err) => {
  console.error("[upload-r2] Error:", err);
  process.exit(1);
});
