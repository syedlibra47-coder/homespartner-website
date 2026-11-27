(async function () {
  if (window.dataReady) await window.dataReady;

  const grid = document.getElementById('serviceGridHome');
  if (!grid || !window.SERVICES_DATA) return;

  const services = [...window.SERVICES_DATA].sort((a, b) => a.sortOrder - b.sortOrder);

  const serviceImages = {
    'buying': 'assets/photos/burj-khalifa.jpg',
    'rent': 'assets/photos/hero-dubai-marina.jpg',
    'sell': 'assets/photos/interior-dining.jpg',
    'offplan-projects': 'assets/photos/business-bay.jpg',
    'property-management': 'assets/photos/interior-living.jpg',
    'property-maintenance': 'assets/photos/interior-kitchen.jpg'
  };
  const fallbackImage = 'assets/photos/palm-jumeirah.jpg';

  grid.innerHTML = services.map((s, i) => {
    const href = s.id === 'offplan-projects' ? 'offplan-listings.html' : `services.html#${s.id}`;
    const image = serviceImages[s.id] || fallbackImage;
    return `
    <div class="service-card reveal in-view" data-href="${href}" data-service-id="${s.id}">
      <div class="service-image">
        <img src="${image}" alt="${s.title}">
        <span class="service-index">${String(i + 1).padStart(2, '0')}</span>
        <div class="service-image-overlay">
          <div class="service-image-overlay-text">
            <h3>${s.title}</h3>
            <p>${s.cardSummary}</p>
          </div>
          <a href="${href}" class="service-arrow-btn" aria-label="${s.ctaLabel}" onclick="event.stopPropagation()">
            <svg viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M17 7H8M17 7v9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.service-card[data-href]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, select, textarea')) return;
      window.location.href = card.dataset.href;
    });
  });
})();
