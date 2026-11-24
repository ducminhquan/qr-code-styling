// Ids inside a drawn SVG (clip paths, gradients) are fixed names such as "clip-path-dot-color". Two codes
// inlined in one page then point at each other's clip paths and gradients. These helpers rename them.

let counter = 0;

const REFERENCE_ATTRIBUTES = ["clip-path", "fill", "stroke", "mask", "filter", "href", "xlink:href"];

/**
 * Puts `prefix` in front of every id inside `svg` and of every url(#id) and href="#id" reference, including
 * references to ids the code does not define, so they cannot pick up another code's element.
 */
export function prefixSvgIds(svg: Element, prefix: string): void {
  const rename = (name: string, value: string): string =>
    name.endsWith("href")
      ? value.replace(/^#(.+)$/, (_match, id: string) => `#${prefix}${id}`)
      : // Only url(#id): a plain fill="#fff" is a color.
        value.replace(
          /url\(\s*(['"]?)#([^'")]+)\1\s*\)/g,
          (_match, quote: string, id: string) => `url(${quote}#${prefix}${id}${quote})`
        );

  // Walks childNodes with getAttribute/setAttribute only, so it also works on the DOM-free SVG used on Node.
  const visit = (element: Element): void => {
    const id = element.getAttribute("id");
    if (id) element.setAttribute("id", prefix + id);
    REFERENCE_ATTRIBUTES.forEach((name) => {
      const value = element.getAttribute(name);
      if (value && value.includes("#")) {
        const renamed = rename(name, value);
        if (renamed !== value) element.setAttribute(name, renamed);
      }
    });
    Array.from(element.childNodes as ArrayLike<Node>).forEach((child) => {
      if (typeof (child as Element).getAttribute === "function") visit(child as Element);
    });
  };
  visit(svg);
}

/**
 * When `svg` sits in a document that already has an element with one of its ids (another QR code on the
 * page, before it), gives its ids a prefix of their own. The first code on a page keeps its ids unchanged.
 */
export function avoidIdClashes(svg: Element): void {
  const document = svg.ownerDocument;
  if (!document || !svg.isConnected) return;
  const clashes = Array.from(svg.querySelectorAll("[id]")).some((element) =>
    Array.from(document.querySelectorAll(`[id="${element.getAttribute("id")}"]`)).some(
      // Only an earlier element counts, so the first code on the page keeps its ids.
      (other) => !svg.contains(other) && !!(other.compareDocumentPosition(svg) & 4)
    )
  );
  if (clashes) prefixSvgIds(svg, `qr${++counter}-`);
}
