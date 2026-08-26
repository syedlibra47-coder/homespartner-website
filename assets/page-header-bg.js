// Applies an admin-chosen background (flat color, image, or YouTube video)
// to a secondary page's title banner (<section class="page-hero" data-page="...">).
// Leaves the section untouched when the admin has it set to "Default" (or when
// nothing is configured yet), so the built-in navy gradient shows as before.
(async function () {
  if (window.dataReady) await window.dataReady;

  const hero = document.querySelector('.page-hero[data-page]');
  if (!hero) return;

  const data = window.PAGE_HEADERS_DATA && window.PAGE_HEADERS_DATA[hero.dataset.page];
  if (!data) return;

  function applyOverlayTint() {
    if (!data.overlayColor) return;
    hero.style.setProperty('--page-hero-overlay', `linear-gradient(160deg, ${data.overlayColor}ED 0%, ${data.overlayColor}E0 100%)`);
  }

  if (data.bgType === 'color' && data.bgColor) {
    hero.classList.add('page-hero--solid');
    hero.style.background = data.bgColor;
  } else if (data.bgType === 'image' && data.bgImage) {
    hero.classList.add('page-hero--media');
    applyOverlayTint();
    const mediaEl = hero.querySelector('.hero-bg-media');
    if (mediaEl) mediaEl.innerHTML = `<img src="${data.bgImage}" alt="" class="hero-photo">`;
  } else if (data.bgType === 'video' && data.bgVideoId) {
    hero.classList.add('page-hero--media');
    applyOverlayTint();
    const mediaEl = hero.querySelector('.hero-bg-media');
    if (mediaEl) {
      mediaEl.innerHTML = `<iframe src="https://www.youtube.com/embed/${data.bgVideoId}?autoplay=1&mute=1&loop=1&playlist=${data.bgVideoId}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1" allow="autoplay; encrypted-media" title="Background video"></iframe>`;
      const sizeVideo = () => {
        const iframe = mediaEl.querySelector('iframe');
        if (!iframe) return;
        const w = mediaEl.clientWidth, h = mediaEl.clientHeight, ratio = 16 / 9;
        if (w / h > ratio) {
          iframe.style.width = w + 'px';
          iframe.style.height = Math.ceil(w / ratio) + 'px';
        } else {
          iframe.style.height = h + 'px';
          iframe.style.width = Math.ceil(h * ratio) + 'px';
        }
      };
      sizeVideo();
      window.addEventListener('resize', sizeVideo);
    }
  }
})();
