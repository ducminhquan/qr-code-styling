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

  it("package.json exports map keeps deep lib/ imports working", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    expect(pkg.main).toBe("lib/qr-code-styling.js");
    expect(pkg.exports["./lib/*"]).toBe("./lib/*");
    expect(fs.existsSync(path.join(lib, "index.d.ts"))).toBe(true);
  });
});
