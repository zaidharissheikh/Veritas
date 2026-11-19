// Tiny element builder. Text always goes through textContent / text nodes —
// never innerHTML — so page-derived strings can't become markup.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function h(tag, props, ...children) {
  return build(document.createElement(tag), props, children);
}

export function svg(tag, props, ...children) {
  return build(document.createElementNS(SVG_NS, tag), props, children);
}

export function replaceChildren(el, ...children) {
  while (el.firstChild) el.removeChild(el.firstChild);
  appendChildren(el, children);
  return el;
}

function build(el, props, children) {
  applyProps(el, props || {});
  appendChildren(el, children);
  return el;
}

function applyProps(el, props) {
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'className') el.setAttribute('class', value);
    else if (key === 'text') el.textContent = String(value);
    else if (key === 'style' && typeof value === 'object') applyStyle(el, value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else el.setAttribute(key, value === true ? '' : String(value));
  }
}

function applyStyle(el, style) {
  for (const [prop, value] of Object.entries(style)) {
    if (value == null) continue;
    if (prop.startsWith('--')) el.style.setProperty(prop, String(value));
    else el.style[prop] = value;
  }
}

function appendChildren(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === true) continue;
    if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
}
