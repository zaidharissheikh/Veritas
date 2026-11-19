/* Decides which extraction path a page takes: 'video' for a YouTube watch page, else 'article'. */
(function (ns) {
  var YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];

  // A /watch page without a usable ?v= still counts as video, so the user gets the
  // specific "which video is this?" message (no_video_id) instead of "not an article".
  ns.detectPageType = function detectPageType(href) {
    var url = new URL(href);
    var isYouTube = YOUTUBE_HOSTS.indexOf(url.hostname) !== -1;
    return isYouTube && url.pathname === '/watch' ? 'video' : 'article';
  };
})(window.__veritas);
