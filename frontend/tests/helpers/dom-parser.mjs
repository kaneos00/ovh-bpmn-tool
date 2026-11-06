const decodeXml = value => value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
  const normalized = entity.toLowerCase();
  if (normalized === 'amp') return '&';
  if (normalized === 'lt') return '<';
  if (normalized === 'gt') return '>';
  if (normalized === 'quot') return '"';
  if (normalized === 'apos') return "'";
  if (normalized.startsWith('#x')) return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
  if (normalized.startsWith('#')) return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
  return match;
});

const encodeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const matches = (node, selector) => {
  if (selector === '*') return true;
  if (selector === '[id]') return node.getAttribute('id') !== null;
  return node.localName === selector;
};

const descendants = (nodes, includeSelf = false) => {
  const result = [];
  const visit = node => {
    result.push(node);
    node.children.forEach(visit);
  };
  nodes.forEach(node => {
    if (includeSelf) visit(node);
    else node.children.forEach(visit);
  });
  return result;
};

class TestElement {
  constructor(name, attributes = {}) {
    this.nodeName = name;
    this.localName = name.includes(':') ? name.split(':').pop() : name;
    this.attributes = attributes;
    this.children = [];
    this.parentElement = null;
    this._text = '';
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  get textContent() {
    return this._text + this.children.map(child => child.textContent).join('');
  }

  querySelectorAll(selector) {
    if (selector.startsWith(':scope > ')) {
      const childSelector = selector.slice(9);
      return this.children.filter(child => matches(child, childSelector));
    }
    if (selector.includes(' > ')) {
      const [parentSelector, childSelector] = selector.split(' > ');
      return descendants([this], true)
        .filter(node => matches(node, parentSelector))
        .flatMap(parent => parent.children.filter(child => matches(child, childSelector)));
    }
    return descendants([this]).filter(node => matches(node, selector));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  getElementsByTagNameNS(_namespace, localName) {
    return descendants([this]).filter(node => node.localName === localName);
  }
}

class TestDocument {
  constructor(root) {
    this.documentElement = root;
  }

  querySelectorAll(selector) {
    if (selector.includes(' > ')) {
      const [parentSelector, childSelector] = selector.split(' > ');
      return descendants([this.documentElement], true)
        .filter(node => matches(node, parentSelector))
        .flatMap(parent => parent.children.filter(child => matches(child, childSelector)));
    }
    return descendants([this.documentElement], true).filter(node => matches(node, selector));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  getElementsByTagNameNS(_namespace, localName) {
    return descendants([this.documentElement], true).filter(node => node.localName === localName);
  }
}

const parseXml = source => {
  const documentNode = { children: [] };
  const stack = [documentNode];
  const tokens = source.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]+>|[^<]+/g) ?? [];

  for (const token of tokens) {
    if (token.startsWith('<?') || token.startsWith('<!--')) continue;
    if (token.startsWith('</')) {
      const name = token.slice(2, -1).trim();
      const current = stack.pop();
      if (!current || current.nodeName !== name) throw new Error('Mismatched XML closing tag');
      continue;
    }
    if (token.startsWith('<')) {
      const selfClosing = /\/\s*>$/.test(token);
      const inside = token.slice(1, selfClosing ? -2 : -1).trim();
      const name = inside.match(/^([^\s/>]+)/)?.[1];
      if (!name) throw new Error('Invalid XML element');
      const attributes = {};
      const attributeSource = inside.slice(name.length);
      const attributePattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let attribute;
      while ((attribute = attributePattern.exec(attributeSource))) {
        attributes[attribute[1]] = decodeXml(attribute[2] ?? attribute[3] ?? '');
      }
      const element = new TestElement(name, attributes);
      stack[stack.length - 1].appendChild(element);
      if (!selfClosing) stack.push(element);
      continue;
    }
    if (stack.length > 1) stack[stack.length - 1]._text += decodeXml(token);
  }

  if (stack.length !== 1 || documentNode.children.length !== 1) {
    throw new Error('Incomplete or invalid XML document');
  }
  return new TestDocument(documentNode.children[0]);
};

globalThis.DOMParser = class {
  parseFromString(source) {
    try {
      return parseXml(source);
    } catch {
      return new TestDocument(new TestElement('parsererror'));
    }
  }
};

globalThis.XMLSerializer = class {
  serializeToString(element) {
    const attributes = Object.entries(element.attributes)
      .map(([name, value]) => ` ${name}="${encodeXml(value)}"`)
      .join('');
    const content = element._text + element.children.map(child => this.serializeToString(child)).join('');
    return content
      ? `<${element.nodeName}${attributes}>${encodeXml(element._text)}${element.children.map(child => this.serializeToString(child)).join('')}</${element.nodeName}>`
      : `<${element.nodeName}${attributes}/>`;
  }
};
