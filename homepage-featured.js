(async function () {
  if (window.dataReady) await window.dataReady;

  const WHATSAPP_NUMBER = (window.CONTACT_CONTENT_DATA && window.CONTACT_CONTENT_DATA.whatsappNumber) || '971500000000';

  // ===== Featured listings =====
  const listingGrid = document.getElementById('listingGrid');
  if (listingGrid && window.LISTINGS_DATA) {
    const all = Object.values(window.LISTINGS_DATA);
    const featured = all.filter(l => l.featured);
    const chosen = (featured.length ? featured : all).slice(0, 6);

    function listingCardHtml(l) {
      const waMessage = `Hi, I'm interested in ${l.title} (${l.community}, ${l.city}). Could you share more details?`;
      const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;
      return `
      <article class="listing-card reveal in-view" data-type="${l.type}" data-listing-id="${l.id}">
        <div class="listing-image">
          <img src="${l.hero}" alt="${l.title}, ${l.community}">
          <div class="card-badges-row">
            <span class="card-badge card-badge--solid">${l.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
            ${l.featured ? '<span class="card-badge card-badge--outline">Featured</span>' : ''}
          </div>
          <a class="card-fav-btn" href="${waHref}" target="_blank" rel="noopener" aria-label="Enquire about ${l.title} on WhatsApp">
            <img src="assets/WhatsApp.svg.webp" alt="">
          </a>
          <div class="listing-overlay">
            <p class="listing-overlay-eyebrow">${l.community}, ${l.city}</p>
            <h3 class="listing-overlay-title">${l.title}</h3>
            <p class="listing-overlay-sub">${l.beds === 'Studio' ? 'Studio' : l.beds + ' Beds'} &middot; ${l.baths} Baths</p>
          </div>
        </div>
        <div class="listing-footer-stats">
          <div class="listing-specs">
            <span><svg viewBox="0 0 24 24" fill="none"><path d="M3 19v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 19h18M6 11V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>${l.beds === 'Studio' ? 'Studio' : l.beds + ' Beds'}</span>
            <span><svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 8.5h17M8.5 3.5v17" stroke="currentColor" stroke-width="1.8"/></svg>${l.sqft} sqft</span>
          </div>
          <div class="listing-price-row">
            <span class="listing-price-tag">${l.priceLabel}${l.priceSuffix ? ` <span>${l.priceSuffix}</span>` : ''}</span>
            <a href="listing-detail.html?id=${l.id}" class="listing-view-link">View Details &rarr;</a>
          </div>
        </div>
      </article>`;
    }

    function renderListings(filter) {
      const list = filter === 'all' ? chosen : chosen.filter(l => l.type === filter);
      listingGrid.innerHTML = list.map(listingCardHtml).join('');
      listingGrid.querySelectorAll('.listing-card[data-listing-id]').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          if (e.target.closest('a, button, input, select, textarea')) return;
          window.location.href = `listing-detail.html?id=${card.dataset.listingId}`;
        });
      });
    }

    renderListings('all');

    const filterBar = document.getElementById('listingFilters');
    if (filterBar) {
      filterBar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderListings(btn.dataset.filter);
        });
      });
    }
  }

  // ===== Featured off-plan projects =====
  const offplanGrid = document.getElementById('offplanGrid');
  if (offplanGrid && window.OFFPLAN_DATA) {
    const all = Object.values(window.OFFPLAN_DATA);
    const featured = all.filter(p => p.featured);
    const chosen = (featured.length ? featured : all).slice(0, 4);

    function unitRangeLabel(unitTypes) {
      if (!unitTypes || !unitTypes.length) return '';
      const first = unitTypes[0].type, last = unitTypes[unitTypes.length - 1].type;
      return first === last ? first : `${first} – ${last}`;
    }

    function offplanCardHtml(p) {
      const plan = p.paymentPlans[0];
      const waMessage = `Hi, I'm interested in ${p.title} (${p.community}). Could you share more details?`;
      const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;
      return `
      <article class="offplan-project reveal in-view" data-offplan-id="${p.id}">
        <div class="offplan-image">
          <img src="${p.hero}" alt="${p.title}, ${p.community}">
          <div class="card-badges-row">
            <span class="card-badge card-badge--solid">${p.status}</span>
            <span class="card-badge card-badge--outline">${plan.label} Plan</span>
          </div>
          <a class="card-fav-btn" href="${waHref}" target="_blank" rel="noopener" aria-label="Enquire about ${p.title} on WhatsApp">
            <img src="assets/WhatsApp.svg.webp" alt="">
          </a>
          <div class="listing-overlay">
            <p class="listing-overlay-eyebrow">${p.community}</p>
            <h3 class="listing-overlay-title">${p.title}</h3>
            <p class="listing-overlay-sub">By ${p.developer}</p>
          </div>
        </div>
        <div class="listing-footer-stats">
          <div class="listing-specs">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 19v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 19h18M6 11V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>${unitRangeLabel(p.unitTypes)}</span>
            <span>Handover ${p.handover}</span>
          </div>
          <div class="listing-price-row">
            <span class="listing-price-tag">from ${p.priceLabel}</span>
            <a href="offplan-detail.html?id=${p.id}" class="listing-view-link">Discover More &rarr;</a>
          </div>
        </div>
      </article>`;
    }

    offplanGrid.innerHTML = chosen.map(offplanCardHtml).join('');
    offplanGrid.querySelectorAll('.offplan-project[data-offplan-id]').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input, select, textarea')) return;
        window.location.href = `offplan-detail.html?id=${card.dataset.offplanId}`;
      });
    });
  }
})();
