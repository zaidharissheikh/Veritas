/* Article path (CONTRACTS 7). Reads the live page but never changes it: Readability always
 * works on document.cloneNode(true). Needs the vendored Readability + isProbablyReaderable. */
(function (ns) {
  var MIN_WORDS = 80;
  var BREAK = '\u2029'; // temporary paragraph marker (Unicode paragraph separator), turned into "\n\n" at the end
  var BLOCK_SELECTOR =
    'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, figcaption, dt, dd, tr, div, section, article, br';
  var SCOPED_HEADLINE_SELECTOR =
    'article h1, main h1, [role="main"] h1, [itemprop="headline"]';

  ns.extractArticle = function extractArticle(doc, href) {
    if (!isProbablyReaderable(doc)) return ns.fail('not_article', 'article');

    var parsed = parseCopy(doc);
    if (!parsed || !parsed.content) return ns.fail('not_article', 'article');

    var body = bodyText(parsed.content);
    var wordCount = countWords(body);
    if (wordCount < MIN_WORDS) return ns.fail('body_too_short', 'article');

    var headline = pickHeadline(doc, parsed);
    if (!headline) return ns.fail('no_headline', 'article');

    return ns.success('article', href, {
      headline: headline,
      body: body,
      excerpt: ns.cleanLine(parsed.excerpt) || body.split('\n\n')[0],
      byline: ns.cleanLine(parsed.byline) || null,
      siteName: ns.cleanLine(parsed.siteName) || hostnameOf(href),
      lang: parsed.lang || null,
      publishedTime: parsed.publishedTime || publishedFromPage(doc) || null,
      wordCount: wordCount,
      charCount: body.length,
    });
  };

  // The serializer hands back the cleaned article element (it lives in the clone, not the page).
  function parseCopy(doc) {
    var options = { serializer: function (el) { return el; } };
    return new Readability(doc.cloneNode(true), options).parse();
  }

  // Plain text with one blank line between paragraphs and single spaces inside them.
  function bodyText(articleEl) {
    var blocks = articleEl.querySelectorAll(BLOCK_SELECTOR);
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].appendChild(articleEl.ownerDocument.createTextNode(BREAK));
    }
    return articleEl.textContent
      .split(BREAK)
      .map(ns.cleanLine)
      .filter(Boolean)
      .join('\n\n');
  }

  function countWords(text) {
    return text.split(/\s+/).filter(Boolean).length;
  }

  // First h1 in the article area; else the page's only h1; else Readability's title; else og:title.
  function pickHeadline(doc, parsed) {
    var allH1 = doc.querySelectorAll('h1');
    var soleH1 = allH1.length === 1 ? allH1[0] : null;
    return (
      firstText(doc.querySelectorAll(SCOPED_HEADLINE_SELECTOR)) ||
      firstText(soleH1 ? [soleH1] : []) ||
      ns.cleanLine(parsed.title) ||
      ns.metaContent(doc, 'meta[property="og:title"]')
    );
  }

  function firstText(elements) {
    for (var i = 0; i < elements.length; i++) {
      var text = ns.cleanLine(elements[i].textContent);
      if (text) return text;
    }
    return '';
  }

  function publishedFromPage(doc) {
    var time = doc.querySelector('article time[datetime], time[datetime]');
    return ns.metaContent(doc, 'meta[property="article:published_time"]') ||
      (time ? time.getAttribute('datetime') : '');
  }

  function hostnameOf(href) {
    return new URL(href).hostname.replace(/^www\./, '');
  }
})(window.__veritas);
