// Copies shared/tokens.css into the dashboard and the extension.
// Usage: node scripts/sync-tokens.mjs
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "shared/tokens.css");
const targets = ["dashboard/src/styles/tokens.css", "extension/styles/tokens.css"];

for (const target of targets) {
  const dest = resolve(root, target);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(source, dest);
  console.log(`synced → ${target}`);
}
