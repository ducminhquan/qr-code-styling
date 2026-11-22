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

// "qr-code-styling-node/print": sheets and PDFs, reusing the core build.
const useBuilt = (core) => ({
  name: "use-built",
  setup(context) {
    context.onResolve({ filter: /\/core\/QRCodeStyling$/ }, () => ({ path: core, external: true }));
  }
});

for (const [format, extension, core] of [
  ["esm", "mjs", "./qr-code-styling.mjs"],
  ["cjs", "cjs", "./qr-code-styling.js"]
]) {
  await build({
    entryPoints: ["src/print/index.ts"],
    outfile: `lib/print.${extension}`,
    bundle: true,
    format,
    platform: "neutral",
    target: "es2018",
    sourcemap: true,
    external: ["qrcode-generator"],
    plugins: [useBuilt(core)],
    logLevel: "info"
  });
}

// Command line (bin). CommonJS so it can require() optional packages; uses the built core and print.
await build({
  entryPoints: ["src/cli/index.ts"],
  outfile: "lib/cli.cjs",
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  banner: { js: "#!/usr/bin/env node" },
  external: ["qrcode-generator"],
  plugins: [
    {
      name: "use-built",
      setup(context) {
        context.onResolve({ filter: /\/core\/QRCodeStyling$/ }, () => ({
          path: "./qr-code-styling.js",
          external: true
        }));
        context.onResolve({ filter: /\/print\/index$/ }, () => ({ path: "./print.cjs", external: true }));
      }
    }
  ],
  logLevel: "info"
});
