// Reads the active tab on demand: injects the vendored Readability + content scripts, then
// calls window.__veritas.extract() in the page. Always resolves to an ExtractionResult
// (CONTRACTS 7) and never rejects, so the popup only has to branch on `result.ok`.
import { previewSample } from './extract.samples.js';

// Order matters: the content scripts rely on the Readability globals and on namespace.js.
export const CONTENT_FILES = [
  'lib/Readability.js',
  'lib/Readability-readerable.js',
  'content/namespace.js',
  'content/pageType.js',
  'content/article.js',
  'content/youtube.js',
  'content/extract.js',
];

const MESSAGES = {
  unsupported_page:
    'Veritas can only read regular web pages. Open a news article or a YouTube video, then try again.',
  inject_failed:
    "Chrome didn't let Veritas read this page. Reload the tab and try again.",
};

// Pages Chrome never lets extensions script, even though their URLs are http(s).
const BLOCKED_PREFIXES = [
  'https://chromewebstore.google.com/',
  'https://chrome.google.com/webstore',
];

const PREVIEW_DELAY_MS = 350;

export async function extractFromActiveTab() {
  if (!hasScriptingApi()) return previewResult();
  try {
    const tab = await getActiveTab();
    if (!tab || !isReadableUrl(tab.url)) return failure('unsupported_page');
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_FILES });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: runExtraction,
    });
    return validResult(results && results[0] && results[0].result);
  } catch {
    return failure('inject_failed');
  }
}

export function isReadableUrl(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  if (BLOCKED_PREFIXES.some((prefix) => url.startsWith(prefix))) return false;
  return !isPdfUrl(url);
}

function isPdfUrl(url) {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return true;
  }
}

// Serialised and run inside the page, so it must not reference anything from this module.
function runExtraction() {
  return window.__veritas ? window.__veritas.extract() : null;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function validResult(result) {
  const looksValid = result && typeof result === 'object' && typeof result.ok === 'boolean';
  return looksValid ? result : failure('inject_failed');
}

function failure(reason, pageType = 'unknown') {
  return { ok: false, reason, message: MESSAGES[reason], pageType };
}

function hasScriptingApi() {
  return typeof chrome !== 'undefined' && Boolean(chrome.scripting && chrome.tabs);
}

// Design preview: the popup opened as a plain web page (?scenario=video etc.).
async function previewResult() {
  const search = globalThis.location ? globalThis.location.search : '';
  const scenario = new URLSearchParams(search).get('scenario');
  await new Promise((resolve) => setTimeout(resolve, PREVIEW_DELAY_MS));
  return previewSample(scenario);
}
