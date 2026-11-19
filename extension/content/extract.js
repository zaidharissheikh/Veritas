/* Entry point called by the popup: window.__veritas.extract() -> ExtractionResult (CONTRACTS 7).
 * Never throws: anything unexpected becomes an 'extraction_error' result. */
(function (ns) {
  ns.extract = function extract() {
    var href = window.location.href;
    var pageType = 'unknown';
    try {
      pageType = ns.detectPageType(href);
      return pageType === 'video'
        ? ns.extractVideo(document, href)
        : ns.extractArticle(document, href);
    } catch (err) {
      return ns.fail('extraction_error', pageType);
    }
  };
})(window.__veritas);
