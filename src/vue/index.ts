/**
 * Vue 3 wrapper: `import { QRCode } from "qr-code-styling-node/vue"`.
 *
 *   <QRCode :options="{ data: 'https://example.com', dotsOptions: { type: 'rounded' } }" />
 *
 * A template ref exposes `qrCode` (the QRCodeStyling instance), plus `download`, `share` and `getRawData`.
 */
import { defineComponent, h, onMounted, PropType, ref, shallowRef, watch } from "vue";
import QRCodeStyling from "../core/QRCodeStyling";
import sameOptions, { snapshotOptions } from "../tools/sameOptions";
import { DownloadOptions, Extension, Options, ShareOptions } from "../types";

export const QRCode = defineComponent({
  name: "QRCode",
  props: {
    options: { type: Object as PropType<Partial<Options>>, required: true }
  },
  emits: ["update"],
  setup(props, { emit, expose }) {
    const container = ref<HTMLDivElement>();
    const qrCode = shallowRef<QRCodeStyling>();
    let drawn: Partial<Options> | undefined;

    const draw = (options: Partial<Options>): void => {
      if (!container.value) return;
      if (!qrCode.value) {
        qrCode.value = new QRCodeStyling(snapshotOptions(options));
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

    return () => h("div", { ref: container });
  }
});

export default QRCode;
export { QRCodeStyling };
