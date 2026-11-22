/**
 * A tiny DOM subset used to build SVG output where no browser DOM exists (Node.js, Deno, Bun,
 * edge runtimes, workers). It implements only what the SVG renderer calls, and its serializer
 * produces the same markup as a browser / jsdom XMLSerializer, so output is byte-identical
 * to the jsdom path.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

const escapeAttribute = (value: string): string =>
  value.replace(/[&<>"\t\n\r]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "\t":
        return "&#x9;";
      case "\n":
        return "&#xA;";
      default:
        return "&#xD;";
    }
  });

export class VirtualSVGElement {
  readonly namespaceURI = SVG_NS;
  readonly tagName: string;
  parentNode: VirtualSVGElement | null = null;
  childNodes: VirtualSVGElement[] = [];
  private _attributes = new Map<string, string>();

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  get nodeName(): string {
    return this.tagName;
  }

  setAttribute(name: string, value: string): void {
    this._attributes.set(name, String(value));
  }

  getAttribute(name: string): string | null {
    const value = this._attributes.get(name);
    return value === undefined ? null : value;
  }

  removeAttribute(name: string): void {
    this._attributes.delete(name);
  }

  appendChild<T extends VirtualSVGElement>(child: T): T {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild<T extends VirtualSVGElement>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index !== -1) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  replaceChild<T extends VirtualSVGElement>(newChild: VirtualSVGElement, oldChild: T): T {
    const index = this.childNodes.indexOf(oldChild);
    if (index !== -1) {
      if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
      this.childNodes[index] = newChild;
      newChild.parentNode = this;
      oldChild.parentNode = null;
    }
    return oldChild;
  }

  cloneNode(deep = false): VirtualSVGElement {
    const clone = new VirtualSVGElement(this.tagName);
    this._attributes.forEach((value, name) => clone.setAttribute(name, value));
    if (deep) this.childNodes.forEach((child) => clone.appendChild(child.cloneNode(true)));
    return clone;
  }

  serialize(isRoot = true): string {
    let markup = `<${this.tagName}`;
    if (isRoot) markup += ` xmlns="${SVG_NS}"`;
    this._attributes.forEach((value, name) => {
      markup += ` ${name}="${escapeAttribute(value)}"`;
    });
    if (!this.childNodes.length) return `${markup}/>`;
    markup += ">";
    for (const child of this.childNodes) markup += child.serialize(false);
    return `${markup}</${this.tagName}>`;
  }
}

export class VirtualXMLSerializer {
  serializeToString(node: VirtualSVGElement): string {
    return node.serialize(true);
  }
}

class VirtualDocument {
  createElementNS(_namespace: string, tagName: string): VirtualSVGElement {
    return new VirtualSVGElement(tagName);
  }
}

/** Window-like object accepted wherever the SVG renderer expects a DOM window. */
export const createVirtualWindow = () => ({
  document: new VirtualDocument(),
  XMLSerializer: VirtualXMLSerializer,
  isVirtual: true as const
});

export const hasBrowserDom = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined" && typeof document.createElementNS === "function";
