// Loads an HTML page into jsdom and runs the content scripts exactly as the popup injects them:
// the same files, in the same order (CONTENT_FILES), as classic scripts in the page's global scope.
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { CONTENT_FILES } from '../../popup/services/extract.js';

const EXTENSION_ROOT = new URL('../../', import.meta.url);
const FIXTURES = new URL('../fixtures/', import.meta.url);

const SOURCES = CONTENT_FILES.map((file) => readFileSync(new URL(file, EXTENSION_ROOT), 'utf8'));

export function readFixture(name) {
  return readFileSync(new URL(name, FIXTURES), 'utf8');
}

export function loadPage(html, url) {
  // Page errors would otherwise print to the test output; failures surface through assertions.
  const virtualConsole = new VirtualConsole();
  return new JSDOM(html, { url, runScripts: 'outside-only', virtualConsole });
}

export function injectContentScripts(dom) {
  for (const source of SOURCES) dom.window.eval(source);
}

// Returns { result, before, after } so tests can check the live page was left untouched.
export function extractFrom(html, url) {
  const dom = loadPage(html, url);
  const before = dom.serialize();
  injectContentScripts(dom);
  const result = dom.window.__veritas.extract();
  return { dom, result, before, after: dom.serialize() };
}
