/**
 * Vue 3 wrapper: `import { QRCode } from "qr-code-styling-node/vue"`.
 *
 *   <QRCode :options="{ data: 'https://example.com', dotsOptions: { type: 'rounded' } }" />
 *
 * A template ref exposes `qrCode` (the QRCodeStyling instance), plus `download`, `share` and `getRawData`.
 *
 * Server rendering (Nuxt, Vue SSR): the code is drawn as SVG on the server and put in the HTML, logo and
 * frame included. The browser keeps that markup until it has drawn the live code.
 */
import { defineComponent, h, onMounted, onServerPrefetch, PropType, ref, shallowRef, watch } from "vue";
import QRCodeStyling from "../core/QRCodeStyling";
import sameOptions, { snapshotOptions } from "../tools/sameOptions";
import { DownloadOptions, Extension, Options, ShareOptions } from "../types";

export const QRCode = defineComponent({
  name: "QRCode",
  props: {
    options: { type: Object as PropType<Partial<Options>>, required: true },
    /** SVG markup for the server HTML. Optional: without it the server draws the code itself. */
    svg: { type: String, default: undefined }
  },
  emits: ["update"],
  setup(props, { emit, expose }) {
    const container = ref<HTMLDivElement>();
    const qrCode = shallowRef<QRCodeStyling>();
    let drawn: Partial<Options> | undefined;
    // Only set during server rendering. The browser renders the div without children, so Vue keeps the
    // server's markup on hydration until onMounted() replaces it.
    const serverMarkup = ref<string>();

    onServerPrefetch(async () => {
      serverMarkup.value =
        props.svg ??
        (await new QRCodeStyling({ ...snapshotOptions(props.options), type: "svg" }).getSVGString().catch(() => ""));
    });

    const draw = (options: Partial<Options>): void => {
      if (!container.value) return;
      if (!qrCode.value) {
        qrCode.value = new QRCodeStyling(snapshotOptions(options));
        container.value.innerHTML = "";
        qrCode.value.append(container.value);
      } else if (!sameOptions(drawn, options)) {
        qrCode.value.update(snapshotOptions(options));
      } else {
        return;
      }
      // Vue may change the same object in place, so keep a copy to compare with.
      drawn = snapshotOptions(options);
      emit("update", qrCode.value);
    };

    onMounted(() => draw(props.options));
    watch(
      () => props.options,
      (options) => draw(options),
      { deep: true }
    );

    expose({
      qrCode,
      download: (options?: Partial<DownloadOptions>) => qrCode.value?.download(options),
      share: (options?: ShareOptions) => qrCode.value?.share(options),
      getRawData: (extension?: Extension) => qrCode.value?.getRawData(extension)
    });

    return () =>
      serverMarkup.value === undefined
        ? h("div", { ref: container })
        : h("div", { ref: container, innerHTML: serverMarkup.value });
  }
});

export default QRCode;
export { QRCodeStyling };
