// Admin-managed promotional image popup — site-wide or targeted to specific
// pages, with a configurable width/height (the box always keeps the image's
// aspect ratio, so it scales down cleanly on any screen), an optional
// click-through link, a close button, and an optional auto-dismiss timer.
// Once closed, it won't show again in that browser tab's session.
(function () {
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function init() {
    if (window.dataReady) await window.dataReady;

    const banners = window.POPUP_BANNERS_DATA || [];
    if (!banners.length) return;

    const currentPage = (location.pathname.split('/').pop() || 'index.html');

    const eligible = banners.filter(b => {
      if (!b.active || !b.imageUrl) return false;
      if (b.targetScope === 'specific') return (b.targetPages || []).includes(currentPage);
      return true;
    });
    if (!eligible.length) return;

    const banner = eligible[0];
    const dismissKey = 'hp_popup_dismissed_' + banner.id;
    try {
      if (sessionStorage.getItem(dismissKey)) return;
    } catch (err) { /* sessionStorage unavailable (private mode etc.) — show it anyway */ }

    show(banner, dismissKey);
  }

  function show(banner, dismissKey) {
    const width = Number(banner.width) > 0 ? Number(banner.width) : 480;
    const height = Number(banner.height) > 0 ? Number(banner.height) : 600;

    const overlay = document.createElement('div');
    overlay.className = 'popup-banner-overlay';
    overlay.style.setProperty('--popup-w', width);
    overlay.style.setProperty('--popup-h', height);

    const mediaHtml = `<img src="${esc(banner.imageUrl)}" alt="${esc(banner.imageAlt || banner.title || '')}">`;

    overlay.innerHTML = `
      <div class="popup-banner-box">
        <button type="button" class="popup-banner-close" aria-label="Close">&times;</button>
        ${banner.linkUrl
          ? `<a href="${esc(banner.linkUrl)}" class="popup-banner-link" target="_blank" rel="noopener">${mediaHtml}</a>`
          : mediaHtml}
      </div>`;

    document.body.appendChild(overlay);

    function dismiss() {
      overlay.classList.remove('is-visible');
      window.removeEventListener('keydown', onKeydown);
      setTimeout(() => overlay.remove(), 300);
      try { sessionStorage.setItem(dismissKey, '1'); } catch (err) { /* ignore */ }
    }

    function onKeydown(e) { if (e.key === 'Escape') dismiss(); }
    window.addEventListener('keydown', onKeydown);

    overlay.querySelector('.popup-banner-close').addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });

    // next frame, so the CSS transition actually plays instead of snapping in
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('is-visible')));

    const seconds = Number(banner.autoDismissSeconds) || 0;
    if (seconds > 0) setTimeout(dismiss, seconds * 1000);
  }

  init();
})();
