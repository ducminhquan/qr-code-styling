// Fails when a built file grows past its gzip budget, so the package does not quietly get heavier.
// Raise a budget only on purpose, in the same commit as the feature that needs it.
import fs from "fs";
import path from "path";
import zlib from "zlib";

const budgets = {
  "qr-code-styling.js": 40 * 1024,
  "react.cjs": 2 * 1024,
  "vue.cjs": 2 * 1024,
  "print.cjs": 6 * 1024
};

let failed = false;
for (const [file, budget] of Object.entries(budgets)) {
  const bytes = zlib.gzipSync(fs.readFileSync(path.join("lib", file)), { level: 9 }).length;
  const ok = bytes <= budget;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} lib/${file}: ${(bytes / 1024).toFixed(1)} KB gzip (budget ${budget / 1024} KB)`);
}
if (failed) process.exit(1);
