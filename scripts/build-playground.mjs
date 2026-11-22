// Builds the playground into site/: the page, the UMD build and jsQR (used by "Check it scans").
// Run `npm run playground` (it builds the library first). `--inline` writes one self-contained
// site/playground-inline.html as well, with both scripts embedded.
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const out = join(root, "site");
const lib = join(root, "lib", "qr-code-styling.js");
const jsqr = require.resolve("jsqr/dist/jsQR.js");

mkdirSync(out, { recursive: true });
copyFileSync(join(root, "playground", "index.html"), join(out, "index.html"));
copyFileSync(lib, join(out, "qr-code-styling.js"));
copyFileSync(jsqr, join(out, "jsQR.js"));
writeFileSync(join(out, ".nojekyll"), "");

if (process.argv.includes("--inline")) {
  const page = readFileSync(join(root, "playground", "index.html"), "utf8");
  const embed = (file) =>
    "<script>\n" + readFileSync(file, "utf8").replace(/<\/script/gi, "<\\/script") + "\n</script>";
  const inline = page
    .replace('<script src="qr-code-styling.js"></script>', () => embed(lib))
    .replace('<script src="jsQR.js"></script>', () => embed(jsqr));
  writeFileSync(join(out, "playground-inline.html"), inline);
}
console.log("Playground written to site/");
