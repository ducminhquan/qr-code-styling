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

// Framework wrappers ("qr-code-styling-node/react" and "/vue"). They import the core build next to them
// instead of bundling a second copy, and leave React and Vue to the app.
const useCoreBuild = (file) => ({
  name: "use-core-build",
  setup(context) {
    context.onResolve({ filter: /\/core\/QRCodeStyling$/ }, () => ({ path: file, external: true }));
  }
});

for (const framework of ["react", "vue"]) {
  for (const [format, extension, core] of [
    ["esm", "mjs", "./qr-code-styling.mjs"],
    ["cjs", "cjs", "./qr-code-styling.js"]
  ]) {
    await build({
      entryPoints: [`src/${framework}/index.ts`],
      outfile: `lib/${framework}.${extension}`,
      bundle: true,
      format,
      platform: "neutral",
      target: "es2018",
      sourcemap: true,
      external: [framework, "qrcode-generator"],
      plugins: [useCoreBuild(core)],
      logLevel: "info"
    });
  }
}
