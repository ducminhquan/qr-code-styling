import { RequiredOptions } from "../core/QROptions";
import { PluginArea, PluginDrawContext } from "../types";
import mergeDeep from "./merge";
import getQRArea from "./qrArea";
import getFrameLayout, { hasFrame, innerOptions } from "./frameLayout";
import sanitizeOptions from "./sanitizeOptions";

/** Lets each plugin's configure() adjust the options, in order. */
export function configurePlugins(options: RequiredOptions): RequiredOptions {
  let result = options;
  (options.plugins || []).forEach((plugin) => {
    const changes = plugin.configure?.(result);
    if (changes) result = sanitizeOptions(mergeDeep(result, changes) as RequiredOptions);
  });
  return result;
}

/** Where the code is drawn in the output, frames included. */
export function getPluginArea(options: RequiredOptions, count: number): PluginArea {
  let offsetX = 0;
  let offsetY = 0;
  let codeOptions = options;
  if (hasFrame(options)) {
    const layout = getFrameLayout(options);
    offsetX = layout.qr.x;
    offsetY = layout.qr.y;
    codeOptions = innerOptions(options, layout.qr.size);
  }
  const area = getQRArea(codeOptions, count);
  return {
    x: area.x + offsetX,
    y: area.y + offsetY,
    size: count * area.dotSize,
    dotSize: area.dotSize,
    count
  };
}

export async function runAfterDraw(options: RequiredOptions, draw: Omit<PluginDrawContext, "options">): Promise<void> {
  for (const plugin of options.plugins || []) {
    if (plugin.afterDraw) await plugin.afterDraw({ ...draw, options });
  }
}
