import qrcode from "qrcode-generator";
import getModuleRoles from "./functionModules";

describe("getModuleRoles", () => {
  it.each([1, 2, 7, 14, 40])("marks finders, timing and alignment patterns for version %i", (version) => {
    const qr = qrcode(version, "H");
    qr.addData("x");
    qr.make();
    const count = qr.getModuleCount();
    const role = getModuleRoles(count);

    expect(role(0, 0)).toBe("finder");
    expect(role(7, count - 8)).toBe("finder");
    expect(role(count - 1, 7)).toBe("finder");
    // Timing pattern alternates dark/light and is a function pattern.
    for (let i = 8; i < count - 8; i++) {
      expect(role(6, i)).toBe("function");
      expect(qr.isDark(6, i)).toBe(i % 2 === 0);
    }
    if (version >= 2) {
      // The last alignment pattern centre is dark and surrounded by a light ring.
      const c = count - 7;
      expect(role(c, c)).toBe("function");
      expect(qr.isDark(c, c)).toBe(true);
      expect(qr.isDark(c - 1, c)).toBe(false);
      expect(qr.isDark(c - 2, c)).toBe(true);
    }
    if (version >= 7) {
      expect(role(0, count - 11)).toBe("function");
    }
    expect(role(Math.floor(count / 2) + 1, Math.floor(count / 2) + 3)).toBe("data");
  });
});
