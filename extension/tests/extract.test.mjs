// Content extraction (CONTRACTS 7) against realistic fixture pages in jsdom.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFrom, readFixture, loadPage, injectContentScripts } from './helpers/page.mjs';

const NEWS_URL = 'https://www.northfieldgazette.com/news/2026/10/libraries-closure-vote';
const BLOG_URL = 'https://www.crumbandcoffee.blog/2026/10/rebuilding-my-sourdough-starter';
const WATCH_URL = 'https://www.youtube.com/watch?v=aBcD3fGh1jK&t=42s';

function assertFailure(result, reason, pageType) {
  assert.equal(result.ok, false);
  assert.equal(result.reason, reason);
  assert.equal(result.pageType, pageType);
  assert.ok(result.message.length > 20, 'failure carries a plain-language message');
}

test('news article: headline, clean body and metadata', () => {
  const { result, before, after } = extractFrom(readFixture('news-article.html'), NEWS_URL);
  assert.equal(result.ok, true, result.message);
  assert.equal(result.pageType, 'article');
  assert.equal(result.url, NEWS_URL);
  assert.ok(!Number.isNaN(Date.parse(result.extractedAt)));

  const { article } = result;
  assert.equal(article.headline, 'Council Approves Plan to Close Three City Libraries Despite Fierce Opposition');
  assert.ok(article.wordCount >= 400, `wordCount ${article.wordCount}`);
  assert.equal(article.charCount, article.body.length);
  assert.match(article.body, /^Three of Northfield's seven branch libraries/m);
  assert.match(article.body, /cabinet in the summer\.$/);
  assert.equal(article.siteName, 'The Northfield Gazette');
  assert.match(article.byline, /Hannah Whitfield/);
  assert.equal(article.lang, 'en-GB');
  assert.equal(article.publishedTime, '2026-10-20T18:05:00Z');
  assert.match(article.excerpt, /Three branch libraries will close/);
  assert.equal(after, before, 'live page must not be mutated');
});

test('news article: navigation, ads, sidebar and comments are left out', () => {
  const { body } = extractFrom(readFixture('news-article.html'), NEWS_URL).result.article;
  for (const noise of ['Advertisement', 'Most read', 'TerryB_1958', 'Accept all', 'Related stories', 'All rights reserved', 'Weather']) {
    assert.ok(!body.includes(noise), `body should not contain "${noise}"`);
  }
});

test('news article: paragraphs are separated and whitespace is collapsed', () => {
  const { body } = extractFrom(readFixture('news-article.html'), NEWS_URL).result.article;
  const paragraphs = body.split('\n\n');
  assert.ok(paragraphs.length >= 10, `paragraphs ${paragraphs.length}`);
  // These two paragraphs sit on one source line with no whitespace between the tags.
  assert.ok(paragraphs.some((p) => p.startsWith('The proposal, which passed by 24 votes')));
  assert.ok(!/[ \t]{2,}|\n{3,}/.test(body));
  assert.ok(paragraphs.every((p) => p === p.trim()));
});

test('blog post: sole h1 headline, list items kept, hostname as site name', () => {
  const { result, before, after } = extractFrom(readFixture('blog-post.html'), BLOG_URL);
  assert.equal(result.ok, true, result.message);
  const { article } = result;
  assert.equal(article.headline, 'What I Learned Rebuilding My Sourdough Starter From Scratch');
  assert.ok(article.wordCount >= 300, `wordCount ${article.wordCount}`);
  assert.ok(article.body.split('\n\n').includes('Discard all but a tablespoon of starter before every feed.'));
  assert.ok(!article.body.includes('Archives'));
  assert.equal(article.siteName, 'crumbandcoffee.blog');
  assert.equal(after, before);
});

test('youtube watch page: id, title, channel and thumbnail', () => {
  const { result, before, after } = extractFrom(readFixture('youtube-watch.html'), WATCH_URL);
  assert.equal(result.ok, true, result.message);
  assert.equal(result.pageType, 'video');
  assert.deepEqual({ ...result.video }, { // spread: the object comes from the jsdom realm
    videoId: 'aBcD3fGh1jK',
    title: 'I Tried Waking Up at 5AM for 30 Days (Shocking Results)',
    channel: 'Morning Lab',
    thumbnailUrl: 'https://i.ytimg.com/vi/aBcD3fGh1jK/maxresdefault.jpg',
  });
  assert.equal(after, before);
});

test('youtube: falls back to the tab title when the metadata is not rendered yet', () => {
  const html = readFixture('youtube-watch.html').replace(/<ytd-watch-metadata>[\s\S]*<\/ytd-watch-metadata>/, '');
  const { result } = extractFrom(html, 'https://m.youtube.com/watch?v=aBcD3fGh1jK');
  assert.equal(result.ok, true);
  assert.equal(result.video.title, 'I Tried Waking Up at 5AM for 30 Days (Shocking Results)');
  assert.equal(result.video.channel, null);
});

test('youtube: a watch URL without a valid id is no_video_id', () => {
  const html = readFixture('youtube-watch.html');
  assertFailure(extractFrom(html, 'https://www.youtube.com/watch?v=oops').result, 'no_video_id', 'video');
  assertFailure(extractFrom(html, 'https://www.youtube.com/watch').result, 'no_video_id', 'video');
});

test('youtube pages other than /watch take the article path', () => {
  const html = '<html><head><title>YouTube</title></head><body><ytd-app>Home feed</ytd-app></body></html>';
  assertFailure(extractFrom(html, 'https://www.youtube.com/').result, 'not_article', 'article');
});

test('app shell / login page is not_article and is left untouched', () => {
  const { result, before, after } = extractFrom(readFixture('login-shell.html'), 'https://app.ledgerly.io/login');
  assertFailure(result, 'not_article', 'article');
  assert.equal(after, before);
});

test('short news brief is body_too_short', () => {
  const { result, before, after } = extractFrom(readFixture('short-page.html'), 'https://metrobriefing.net/closures');
  assertFailure(result, 'body_too_short', 'article');
  assert.equal(after, before);
});

test('unexpected errors become extraction_error instead of throwing', () => {
  const dom = loadPage(readFixture('news-article.html'), NEWS_URL);
  injectContentScripts(dom);
  dom.window.eval('Readability.prototype.parse = function () { throw new Error("boom"); }');
  assertFailure(dom.window.__veritas.extract(), 'extraction_error', 'article');
});

test('injecting the scripts twice (popup reopened) still works', () => {
  const dom = loadPage(readFixture('blog-post.html'), BLOG_URL);
  injectContentScripts(dom);
  injectContentScripts(dom);
  assert.equal(dom.window.__veritas.extract().ok, true);
});
