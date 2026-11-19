/* YouTube watch-page path (CONTRACTS 7): video ID, title, channel, thumbnail. No transcript
 * here - that is a backend job. Read-only: queries the live DOM, never changes it. */
(function (ns) {
  var VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
  var TITLE_SELECTORS = [
    'ytd-watch-metadata h1',
    '#above-the-fold #title h1',
    'h1.title.ytd-video-primary-info-renderer',
    '.slim-video-information-title', // m.youtube.com
  ];
  var CHANNEL_SELECTORS = [
    'ytd-watch-metadata ytd-channel-name a',
    '#owner ytd-channel-name a',
    'ytd-video-owner-renderer #channel-name a',
    '.slim-owner-channel-name', // m.youtube.com
  ];

  ns.extractVideo = function extractVideo(doc, href) {
    var videoId = new URL(href).searchParams.get('v');
    if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) return ns.fail('no_video_id', 'video');

    var title = readTitle(doc);
    if (!title) return ns.fail('no_headline', 'video');

    return ns.success('video', href, {
      videoId: videoId,
      title: title,
      channel: readChannel(doc) || null,
      thumbnailUrl: 'https://i.ytimg.com/vi/' + videoId + '/maxresdefault.jpg',
    });
  };

  // document.title looks like "(3) Video title - YouTube" (the count is unread notifications).
  function readTitle(doc) {
    var fromTab = doc.title.replace(/^\s*\(\d+\)\s*/, '').replace(/\s+-\s+YouTube\s*$/, '');
    return firstMatchText(doc, TITLE_SELECTORS) || ns.cleanLine(fromTab);
  }

  function readChannel(doc) {
    return firstMatchText(doc, CHANNEL_SELECTORS) ||
      ns.metaContent(doc, '[itemprop="author"] [itemprop="name"]');
  }

  function firstMatchText(doc, selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = doc.querySelector(selectors[i]);
      var text = el ? ns.cleanLine(el.textContent) : '';
      if (text) return text;
    }
    return '';
  }
})(window.__veritas);
