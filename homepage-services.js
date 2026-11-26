(async function () {
  if (window.dataReady) await window.dataReady;

  const grid = document.getElementById('serviceGridHome');
  if (!grid || !window.SERVICES_DATA) return;

  const services = [...window.SERVICES_DATA].sort((a, b) => a.sortOrder - b.sortOrder);

  const serviceImages = {
    'buying': 'assets/photos/burj-khalifa.jpg',
    'rent': 'assets/photos/palm-jumeirah.jpg',
    'sell': 'assets/photos/interior-dining.jpg',
    'offplan-projects': 'assets/photos/business-bay.jpg',
    'property-management': 'assets/photos/interior-living.jpg',
    'property-maintenance': 'assets/photos/interior-kitchen.jpg'
  };
  const fallbackImage = 'assets/photos/dubai-marina-towers.jpg';

  grid.innerHTML = services.map((s, i) => {
    const href = s.id === 'offplan-projects' ? 'offplan-listings.html' : `services.html#${s.id}`;
    const image = serviceImages[s.id] || fallbackImage;
    return `
    <div class="service-card reveal in-view" data-href="${href}" data-service-id="${s.id}">
      <div class="service-image">
        <img src="${image}" alt="${s.title}">
        <span class="service-index">${String(i + 1).padStart(2, '0')}</span>
      </div>
      <div class="service-body">
        <h3>${s.title}</h3>
        <p>${s.cardSummary}</p>
        <a href="${href}" class="card-link">${s.ctaLabel} <span class="card-link-arrow">&rarr;</span></a>
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
