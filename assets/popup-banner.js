// Admin-managed promotional image popups — site-wide or targeted to specific
// pages, each with its own configurable width/height (the box always keeps
// the image's aspect ratio, so it scales down cleanly on any screen), an
// optional click-through link, a close button, and an optional auto-dismiss
// timer. Multiple eligible banners can be shown together, side by side, each
// running its own auto-dismiss timer independently. Once a banner is closed
// it stays hidden for that banner's configured "show again after" cooldown
// (stored in localStorage, so it survives closing the tab — a cooldown
// measured in hours wouldn't mean anything if it reset every new tab).
(function () {
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

    const eligible = banners.filter(b => {
      if (!b.active || !b.imageUrl) return false;
      if (b.targetScope === 'specific' && !(b.targetPages || []).includes(currentPage)) return false;
      const lastClosed = dismissedAt(b.id);
      if (lastClosed == null) return true;
      const cooldownMs = (Number(b.reshowAfterSeconds) || 0) * 1000;
      return Date.now() - lastClosed >= cooldownMs;
    });
    if (!eligible.length) return;

    showAll(eligible);
  }

  function showAll(banners) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-banner-overlay';

    const stack = document.createElement('div');
    stack.className = 'popup-banner-stack';
    overlay.appendChild(stack);
    document.body.appendChild(overlay);

    function closeAll() {
      overlay.classList.remove('is-visible');
      window.removeEventListener('keydown', onKeydown);
      setTimeout(() => overlay.remove(), 300);
    }
    function onKeydown(e) {
      if (e.key === 'Escape') { banners.forEach(b => markDismissed(b.id)); closeAll(); }
    }
    window.addEventListener('keydown', onKeydown);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { banners.forEach(b => markDismissed(b.id)); closeAll(); }
    });

    banners.forEach(banner => addBox(stack, banner, () => {
      markDismissed(banner.id);
      if (!stack.querySelector('.popup-banner-box')) closeAll();
    }));

    // next frame, so the CSS transition actually plays instead of snapping in
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('is-visible')));
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

    function dismissBox() {
      box.remove();
      onClosed();
    }
    box.querySelector('.popup-banner-close').addEventListener('click', dismissBox);

    const seconds = Number(banner.autoDismissSeconds) || 0;
    if (seconds > 0) setTimeout(dismissBox, seconds * 1000);
  }

  init();
})();
