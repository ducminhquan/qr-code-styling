// Hydration in the browser (jsdom) of HTML rendered on the server by the wrappers.
import { act, createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { createSSRApp, h } from "vue";
import { QRCode as ReactQRCode } from "../src/react/index";
import { QRCode as VueQRCode } from "../src/vue/index";
import QRCodeStyling from "../src/core/QRCodeStyling";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const options = { data: "https://nhathuoclongchau.com.vn", type: "svg", width: 200, height: 200 };

let container;
let serverSVG;
beforeEach(async () => {
  // What the server sent: the wrapper's div with the code inside.
  serverSVG = await new QRCodeStyling({ ...options, data: "server" }).getSVGString();
  container = document.createElement("div");
  container.innerHTML = `<div>${serverSVG}</div>`;
  document.body.appendChild(container);
  vi.spyOn(console, "error");
  vi.spyOn(console, "warn");
});
afterEach(() => {
  container.remove();
  vi.restoreAllMocks();
});

it("React hydrates without warnings and replaces the server markup with the live code", async () => {
  let root;
  await act(async () => {
    root = hydrateRoot(container, createElement(ReactQRCode, { options }));
  });
  expect(console.error).not.toHaveBeenCalled();
  expect(container.querySelectorAll("svg")).toHaveLength(1);
  expect(container.firstChild.innerHTML).not.toBe(serverSVG);
  act(() => root.unmount());
});

it("Vue hydrates without warnings and replaces the server markup with the live code", async () => {
  const app = createSSRApp({ render: () => h(VueQRCode, { options }) });
  app.mount(container);
  await new Promise((resolve) => setTimeout(resolve));
  expect(console.warn).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
  expect(container.querySelectorAll("svg")).toHaveLength(1);
  expect(container.firstChild.innerHTML).not.toBe(serverSVG);
  app.unmount();
});
