import { build } from "esbuild";

// ES module build for bundlers and Node "import". qrcode-generator stays external.
await build({
  entryPoints: ["src/index.ts"],
  outfile: "lib/qr-code-styling.mjs",
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2018",
  sourcemap: true,
  external: ["qrcode-generator"],
  logLevel: "info"
});
