// @vitest-environment node
/**
 * Checks the built package keeps every entry point that 1.5.0 users rely on.
 * Needs `npm run build` first; skipped when lib/ is missing.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { createRequire } from "module";
import { pathToFileURL } from "url";

const root = path.resolve(__dirname, "..");
const lib = path.join(root, "lib");
const built = fs.existsSync(path.join(lib, "qr-code-styling.mjs"));
const requireFromRoot = createRequire(path.join(root, "package.json"));

describe.skipIf(!built)("Package entry points", () => {
  it("require('qr-code-styling-node') returns the class (UMD main)", () => {
    const QRCodeStyling = requireFromRoot(path.join(lib, "qr-code-styling.js"));
    expect(typeof QRCodeStyling).toBe("function");
    expect(QRCodeStyling.name).toBeTruthy();
  });

  it("lib/qr-code-styling.common.js exposes { QRCodeStyling } like 1.5.0", () => {
    const { QRCodeStyling } = requireFromRoot(path.join(lib, "qr-code-styling.common.js"));
    expect(typeof QRCodeStyling).toBe("function");
  });

  it("ESM build has a default export and the named constants", async () => {
    const mod = await import(pathToFileURL(path.join(lib, "qr-code-styling.mjs")).href);
    expect(typeof mod.default).toBe("function");
    for (const name of [
      "dotTypes",
      "cornerDotTypes",
      "cornerSquareTypes",
      "errorCorrectionLevels",
      "modes",
      "qrTypes",
      "drawTypes"
    ]) {
      expect(mod[name]).toBeTruthy();
    }
  });

  it("a <script> tag defines window.QRCodeStyling", () => {
    const sandbox = { window: {}, self: {} };
    sandbox.window = sandbox;
    vm.runInNewContext(fs.readFileSync(path.join(lib, "qr-code-styling.js"), "utf8"), sandbox);
    expect(typeof sandbox.QRCodeStyling).toBe("function");
  });

  it("the <script> bundle still runs on a page without a UTF-8 charset", () => {
    // Decoded as windows-1252, like a browser does without <meta charset="utf-8">: no regex may hold raw non-ASCII.
    const sandbox = { window: {}, self: {} };
    sandbox.window = sandbox;
    const source = new TextDecoder("windows-1252").decode(fs.readFileSync(path.join(lib, "qr-code-styling.js")));
    vm.runInNewContext(source, sandbox);
    expect(typeof sandbox.QRCodeStyling).toBe("function");
  });

  it("package.json exports map keeps deep lib/ imports working", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    expect(pkg.main).toBe("lib/qr-code-styling.js");
    expect(pkg.exports["./lib/*"]).toBe("./lib/*");
    expect(fs.existsSync(path.join(lib, "index.d.ts"))).toBe(true);
  });

  it.each(["react", "vue"])(
    "the %s wrapper is published for require and import, using the core build",
    async (framework) => {
      const exportsMap = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).exports[`./${framework}`];
      for (const file of [exportsMap.types, exportsMap.import, exportsMap.require]) {
        expect(fs.existsSync(path.join(root, file))).toBe(true);
      }
      const cjs = requireFromRoot(path.join(root, exportsMap.require));
      const esm = await import(pathToFileURL(path.join(root, exportsMap.import)).href);
      expect(cjs.QRCode).toBeTruthy();
      expect(esm.QRCode).toBeTruthy();
      expect(cjs.QRCodeStyling).toBe(requireFromRoot(path.join(lib, "qr-code-styling.js")));
      // No second copy of the core inside the wrapper.
      expect(fs.statSync(path.join(root, exportsMap.import)).size).toBeLessThan(10000);
    }
  );

  it("publishes the print subpath and the command line", async () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const exportsMap = pkg.exports["./print"];
    for (const file of [exportsMap.types, exportsMap.import, exportsMap.require]) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
    const cjs = requireFromRoot(path.join(root, exportsMap.require));
    const esm = await import(pathToFileURL(path.join(root, exportsMap.import)).href);
    expect(typeof cjs.pdf).toBe("function");
    expect(typeof esm.sheet).toBe("function");
    // No second copy of the core inside print.
    expect(fs.statSync(path.join(root, exportsMap.import)).size).toBeLessThan(30000);
    const bin = path.join(root, pkg.bin["qr-code-styling-node"]);
    expect(fs.readFileSync(bin, "utf8").startsWith("#!/usr/bin/env node")).toBe(true);
  });
});
