import { act, createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { createApp, h, nextTick, reactive, ref } from "vue";
import { QRCode as ReactQRCode } from "../src/react/index";
import { QRCode as VueQRCode } from "../src/vue/index";
import QRCodeStyling from "../src/core/QRCodeStyling";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const options = { data: "https://nhathuoclongchau.com.vn", type: "svg", width: 200, height: 200 };

describe("React wrapper", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("draws the code and gives the instance through a ref", async () => {
    const instance = createRef();
    const onUpdate = vi.fn();
    await act(async () =>
      root.render(createElement(ReactQRCode, { options, ref: instance, onUpdate, className: "qr" }))
    );
    expect(container.querySelector("div.qr > svg")).toBeTruthy();
    expect(instance.current).toBeInstanceOf(QRCodeStyling);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("redraws only when the options change", async () => {
    const update = vi.spyOn(QRCodeStyling.prototype, "update");
    const onUpdate = vi.fn();
    await act(async () => root.render(createElement(ReactQRCode, { options: { ...options }, onUpdate })));
    const calls = update.mock.calls.length;
    await act(async () => root.render(createElement(ReactQRCode, { options: { ...options }, onUpdate })));
    expect(update.mock.calls.length).toBe(calls);
    await act(async () =>
      root.render(createElement(ReactQRCode, { options: { ...options, data: "changed" }, onUpdate }))
    );
    expect(update.mock.calls.length).toBe(calls + 1);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    update.mockRestore();
  });
});

describe("Vue wrapper", () => {
  it("draws the code, follows option changes and exposes the instance", async () => {
    const element = document.createElement("div");
    const state = reactive({ ...options });
    const component = ref();
    const onUpdate = vi.fn();
    const app = createApp({ render: () => h(VueQRCode, { options: state, ref: component, onUpdate }) });
    app.mount(element);
    await nextTick();
    expect(element.querySelector("svg")).toBeTruthy();
    expect(component.value.qrCode).toBeInstanceOf(QRCodeStyling);
    expect(onUpdate).toHaveBeenCalledTimes(1);

    const update = vi.spyOn(component.value.qrCode, "update");
    state.data = "changed";
    await nextTick();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data).toBe("changed");
    expect(element.querySelectorAll("svg")).toHaveLength(1);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    app.unmount();
  });
});
