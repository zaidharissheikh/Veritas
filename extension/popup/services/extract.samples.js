// Canned ExtractionResults for the design preview (popup opened outside the extension with
// ?scenario=article|video|unsupported|notArticle|short|error|noCaptions). Content is fictional sample text.

const ARTICLE_URL = 'https://www.northfieldgazette.com/business/2026/10/coffee-prices-spring-forecast';

const ARTICLE_BODY = [
  'Coffee drinkers could be paying noticeably more for their morning cup by the spring, according to a forecast published on Tuesday by a group of commodity analysts.',
  'The report points to two poor harvests in a row across several growing regions, combined with higher shipping and storage costs. Wholesale prices for arabica beans have risen by around 18 percent since January, the analysts said, and some of that increase has not yet reached supermarket shelves.',
  '"We are not expecting prices to double, and we would caution against that kind of headline," said Dr. Amira Hassan, who led the research. "What we do expect is a steady rise of between eight and twelve percent at the till over the next six months, depending on the brand."',
  'Independent cafes are likely to feel the pressure first. Several owners in the city told the Gazette that they had already absorbed two supplier increases this year and were reviewing their menus. One owner said she would rather trim portion sizes on pastries than raise the price of a flat white again.',
  'Larger chains buy their beans months in advance and are better protected in the short term, the report notes. Supermarket own-brand ground coffee has so far risen more slowly than premium labels.',
  'The analysts also warned that the outlook could change quickly. A strong harvest next year, or a fall in freight costs, would ease the pressure on prices. Consumer groups advised shoppers to compare the price per kilogram rather than the price per pack, as some brands have quietly reduced pack sizes instead of raising prices.',
  'The full forecast will be presented to the regional trade council next month.',
].join('\n\n');

const ARTICLE = withCounts({
  ok: true,
  pageType: 'article',
  url: ARTICLE_URL,
  extractedAt: '2026-10-22T09:14:00.000Z',
  article: {
    headline: 'Experts Stunned as Coffee Prices Set to DOUBLE by Spring',
    body: ARTICLE_BODY,
    excerpt:
      'Coffee drinkers could be paying noticeably more for their morning cup by the spring, according to a forecast published on Tuesday by a group of commodity analysts.',
    byline: 'By Daniel Okafor, Business Reporter',
    siteName: 'The Northfield Gazette',
    lang: 'en',
    publishedTime: '2026-10-21T07:30:00Z',
  },
});

const VIDEO = {
  ok: true,
  pageType: 'video',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  extractedAt: '2026-10-22T09:16:00.000Z',
  video: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
    channel: 'Rick Astley',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  },
};

const FAILURES = {
  unsupported: {
    ok: false,
    reason: 'unsupported_page',
    message:
      'Veritas can only read regular web pages. Open a news article or a YouTube video, then try again.',
    pageType: 'unknown',
  },
  notArticle: {
    ok: false,
    reason: 'not_article',
    message:
      "This page doesn't look like an article. Veritas works on news stories, blog posts and YouTube videos.",
    pageType: 'article',
  },
  short: {
    ok: false,
    reason: 'body_too_short',
    message:
      "There isn't enough text on this page to check. Veritas needs an article of at least 80 words.",
    pageType: 'article',
  },
};

// `error` and `noCaptions` extract fine: the mock analysis service is what fails in those scenarios.
const SCENARIOS = {
  article: ARTICLE,
  video: VIDEO,
  error: ARTICLE,
  noCaptions: VIDEO,
  ...FAILURES,
};

export function previewSample(scenario) {
  const sample = Object.hasOwn(SCENARIOS, scenario || '') ? SCENARIOS[scenario] : ARTICLE;
  return structuredClone(sample);
}

function withCounts(result) {
  const { body } = result.article;
  result.article.wordCount = body.split(/\s+/).filter(Boolean).length;
  result.article.charCount = body.length;
  return result;
}
