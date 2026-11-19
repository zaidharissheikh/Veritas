// popup/services/extract.js: URL guard, ordered injection, error mapping, design-preview fallback.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { extractFromActiveTab, isReadableUrl, CONTENT_FILES } from '../popup/services/extract.js';
import { loadPage, readFixture, injectContentScripts } from './helpers/page.mjs';

const BLOG_URL = 'https://www.crumbandcoffee.blog/2026/10/rebuilding-my-sourdough-starter';

// Minimal stand-in for chrome.tabs + chrome.scripting that records every executeScript call.
function installChrome({ url, runFiles = () => [], runFunc = () => [{ result: null }] }) {
  const calls = [];
  globalThis.chrome = {
    tabs: { query: async () => (url === undefined ? [] : [{ id: 7, url }]) },
    scripting: {
      executeScript: async (details) => {
        calls.push(details);
        return details.files ? runFiles(details) : runFunc(details);
      },
    },
  };
  return calls;
}

afterEach(() => {
  delete globalThis.chrome;
  delete globalThis.location;
  delete globalThis.window;
});

test('isReadableUrl accepts web pages and rejects browser-internal ones', () => {
  assert.equal(isReadableUrl('https://www.bbc.co.uk/news/articles/abc'), true);
  assert.equal(isReadableUrl('http://localhost:3000/post'), true);
  for (const url of ['chrome://extensions', 'file:///C:/a.html', 'about:blank', 'chrome-extension://x/y.html',
    'https://chromewebstore.google.com/detail/x', 'https://example.com/report.pdf', undefined, '']) {
    assert.equal(isReadableUrl(url), false, String(url));
  }
});

test('non-web tabs are unsupported_page and nothing is injected', async () => {
  const calls = installChrome({ url: 'chrome://newtab/' });
  const result = await extractFromActiveTab();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unsupported_page');
  assert.ok(result.message);
  assert.equal(calls.length, 0);
});

test('no active tab is unsupported_page', async () => {
  installChrome({ url: undefined });
  assert.equal((await extractFromActiveTab()).reason, 'unsupported_page');
});

test('injects lib + content files in order, then calls extract() in the page', async () => {
  const dom = loadPage(readFixture('blog-post.html'), BLOG_URL);
  const calls = installChrome({
    url: BLOG_URL,
    runFiles: () => { injectContentScripts(dom); return [{ result: undefined }]; },
    runFunc: ({ func }) => { globalThis.window = dom.window; return [{ result: func() }]; },
  });
  const result = await extractFromActiveTab();
  assert.equal(result.ok, true, result.message);
  assert.equal(result.pageType, 'article');
  assert.deepEqual(calls[0], { target: { tabId: 7 }, files: CONTENT_FILES });
  assert.deepEqual(calls[1].target, { tabId: 7 });
  assert.equal(CONTENT_FILES[0], 'lib/Readability.js');
  assert.equal(CONTENT_FILES.at(-1), 'content/extract.js');
});

test('a rejected injection becomes inject_failed instead of rejecting', async () => {
  installChrome({
    url: BLOG_URL,
    runFiles: () => { throw new Error('Cannot access contents of the page'); },
  });
  const result = await extractFromActiveTab();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'inject_failed');
  assert.ok(result.message);
});

test('a missing or malformed page result becomes inject_failed', async () => {
  installChrome({ url: BLOG_URL, runFunc: () => [{ result: null }] });
  assert.equal((await extractFromActiveTab()).reason, 'inject_failed');
  installChrome({ url: BLOG_URL, runFunc: () => [] });
  assert.equal((await extractFromActiveTab()).reason, 'inject_failed');
});

test('design preview: ?scenario= picks a canned sample when chrome.scripting is missing', async () => {
  const expected = {
    article: ['article', true], video: ['video', true], error: ['article', true], noCaptions: ['video', true],
    unsupported: ['unknown', 'unsupported_page'], notArticle: ['article', 'not_article'],
    short: ['article', 'body_too_short'], nonsense: ['article', true], constructor: ['article', true],
  };
  for (const [scenario, [pageType, outcome]] of Object.entries(expected)) {
    globalThis.location = { search: `?scenario=${scenario}` };
    const result = await extractFromActiveTab();
    assert.equal(result.pageType, pageType, scenario);
    if (outcome === true) assert.equal(result.ok, true, scenario);
    else assert.equal(result.reason, outcome, scenario);
  }
});

test('design preview samples match the ExtractionResult contract', async () => {
  globalThis.location = { search: '' };
  const { article } = await extractFromActiveTab();
  assert.equal(article.wordCount, article.body.split(/\s+/).length);
  assert.equal(article.charCount, article.body.length);
  assert.ok(article.wordCount >= 80);
  globalThis.location = { search: '?scenario=video' };
  const { video } = await extractFromActiveTab();
  assert.equal(video.thumbnailUrl, `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`);
});
