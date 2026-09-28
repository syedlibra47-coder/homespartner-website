// Admin-managed promotional image popups — site-wide or targeted to specific
// pages, each with its own configurable width/height (the box always keeps
// the image's aspect ratio, so it scales down cleanly on any screen), an
// optional click-through link, a close button, and an optional "Show For"
// timer. Only one popup is ever on screen at a time: if several are
// eligible, they queue up in Display Order and each one appears after the
// previous one closes — either because the visitor closed it, or because
// its own "Show For" timer ran out. Once a banner has been shown and
// closed, it stays hidden for that banner's configured "show again after"
// cooldown (stored in localStorage, so it survives closing the tab — a
// cooldown measured in hours wouldn't mean anything if it reset every new
// tab).
(function () {
  const TRANSITION_MS = 300;

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function dismissedAt(id) {
    try {
      const raw = localStorage.getItem('hp_popup_dismissed_' + id);
      return raw ? Number(raw) : null;
    } catch (err) { return null; }
  }

  function markDismissed(id) {
    try { localStorage.setItem('hp_popup_dismissed_' + id, String(Date.now())); } catch (err) { /* ignore */ }
  }

  async function init() {
    if (window.dataReady) await window.dataReady;

    const banners = window.POPUP_BANNERS_DATA || [];
    if (!banners.length) return;

    const currentPage = (location.pathname.split('/').pop() || 'index.html');

    const queue = banners.filter(b => {
      if (!b.active || !b.imageUrl) return false;
      if (b.targetScope === 'specific' && !(b.targetPages || []).includes(currentPage)) return false;
      const lastClosed = dismissedAt(b.id);
      if (lastClosed == null) return true;
      const cooldownMs = (Number(b.reshowAfterSeconds) || 0) * 1000;
      return Date.now() - lastClosed >= cooldownMs;
    });
    if (!queue.length) return;

    runQueue(queue);
  }

  function runQueue(queue) {
    let index = 0;
    let overlay = null;

    function onKeydown(e) {
      if (e.key === 'Escape') stopEntirely();
    }

    function showCurrent() {
      const banner = queue[index];

      overlay = document.createElement('div');
      overlay.className = 'popup-banner-overlay';
      const stack = document.createElement('div');
      stack.className = 'popup-banner-stack';
      overlay.appendChild(stack);
      document.body.appendChild(overlay);

      addBox(stack, banner, () => { markDismissed(banner.id); advance(); });

      window.addEventListener('keydown', onKeydown);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) stopEntirely(); });

      // next frame, so the CSS transition actually plays instead of snapping in
      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('is-visible')));
    }

    function teardownOverlay() {
      window.removeEventListener('keydown', onKeydown);
      const el = overlay;
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), TRANSITION_MS);
    }

    function advance() {
      teardownOverlay();
      index++;
      if (index < queue.length) setTimeout(showCurrent, TRANSITION_MS);
    }

    // Escape / clicking outside the box means "let me out" — closes the
    // current popup and cancels the rest of the queue, rather than
    // advancing to the next one.
    function stopEntirely() {
      markDismissed(queue[index].id);
      teardownOverlay();
      index = queue.length;
    }

    showCurrent();
  }

  function addBox(stack, banner, onClosed) {
    const width = Number(banner.width) > 0 ? Number(banner.width) : 480;
    const height = Number(banner.height) > 0 ? Number(banner.height) : 600;

    const box = document.createElement('div');
    box.className = 'popup-banner-box';
    box.style.setProperty('--popup-w', width);
    box.style.setProperty('--popup-h', height);

    const mediaHtml = `<img src="${esc(banner.imageUrl)}" alt="${esc(banner.imageAlt || banner.title || '')}">`;
    box.innerHTML = `
      <button type="button" class="popup-banner-close" aria-label="Close">&times;</button>
      ${banner.linkUrl
        ? `<a href="${esc(banner.linkUrl)}" class="popup-banner-link" target="_blank" rel="noopener">${mediaHtml}</a>`
        : mediaHtml}`;
    stack.appendChild(box);

    let done = false;
    function dismissBox() {
      if (done) return;
      done = true;
      onClosed();
    }
    box.querySelector('.popup-banner-close').addEventListener('click', dismissBox);

    const seconds = Number(banner.autoDismissSeconds) || 0;
    if (seconds > 0) setTimeout(dismissBox, seconds * 1000);
  }

  init();
})();
