import fs from "fs";
import path from "path";
import { diffImages } from "./image";

const asset = (name) => fs.readFileSync(path.resolve(__dirname, "../../src/assets/test", name));

describe("image diff helper", () => {
  it("treats an image as equal to itself", async () => {
    expect((await diffImages(asset("simple_qr.png"), asset("simple_qr.png"))).ratio).toBe(0);
  });
  it("detects a different picture of the same size", async () => {
    expect((await diffImages(asset("simple_qr.png"), asset("simple_qr_with_image.png"))).ratio).toBeGreaterThan(0.002);
  });
});
