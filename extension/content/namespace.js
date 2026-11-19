/* Veritas content scripts share one namespace: window.__veritas.
 * These are classic scripts injected on demand by popup/services/extract.js, possibly more
 * than once per page, so nothing here declares top-level let/const (re-injection would throw). */
(function () {
  var ns = (window.__veritas = window.__veritas || {});

  // Plain-language failure reasons shown to the user (keys = ExtractionResult.reason).
  ns.MESSAGES = {
    not_article:
      "This page doesn't look like an article. Veritas works on news stories, blog posts and YouTube videos.",
    body_too_short:
      "There isn't enough text on this page to check. Veritas needs an article of at least 80 words.",
    no_headline:
      "Veritas couldn't find a headline or title on this page. Let it finish loading, then try again.",
    no_video_id:
      "Veritas couldn't tell which video this is. Open the video's own page on YouTube and try again.",
    extraction_error:
      'Something went wrong while reading this page. Reload the tab and try again.',
  };

  ns.fail = function fail(reason, pageType) {
    return { ok: false, reason: reason, message: ns.MESSAGES[reason], pageType: pageType || 'unknown' };
  };

  ns.success = function success(pageType, url, payload) {
    var result = { ok: true, pageType: pageType, url: url, extractedAt: new Date().toISOString() };
    result[pageType] = payload;
    return result;
  };

  // Collapses runs of whitespace (incl. newlines) into single spaces.
  ns.cleanLine = function cleanLine(text) {
    return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
  };

  ns.metaContent = function metaContent(doc, selector) {
    var el = doc.querySelector(selector);
    return el ? ns.cleanLine(el.getAttribute('content')) : '';
  };
})();
