(async function () {
  if (window.dataReady) await window.dataReady;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const agents = window.AGENTS_DATA || [];
  const agent = id ? agents.find(a => a.id === id) : null;

  if (!agent) {
    window.location.href = 'agents.html';
    return;
  }

  const WHATSAPP_MESSAGE = `Hi ${agent.name}, I'd like to know more about a property.`;
  const waHref = `https://wa.me/${agent.phone}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  document.getElementById('pageTitle').textContent = `${agent.name} — HomesPartner Real Estate`;

  document.getElementById('agentBreadcrumb').innerHTML = `
    <a href="index.html#top">Home</a><span class="sep">/</span>
    <a href="agents.html">Agents</a><span class="sep">/</span>
    <span class="current">${agent.name}</span>`;

  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  const avatarEl = document.getElementById('agentProfileAvatar');
  if (agent.photoUrl) {
    avatarEl.classList.add('agent-profile-avatar--photo');
    avatarEl.innerHTML = `<img src="${agent.photoUrl}" alt="${agent.name}">`;
  } else {
    avatarEl.textContent = initials(agent.name);
  }

  document.getElementById('agentProfileName').textContent = agent.name;
  document.getElementById('agentProfileTitle').textContent = agent.title;
  document.getElementById('agentProfileLanguages').textContent = agent.languages && agent.languages.length ? `Speaks: ${agent.languages.join(', ')}` : '';
  document.getElementById('agentProfileSpecialties').innerHTML = (agent.specialties || []).map(s => `<span class="pill">${s}</span>`).join('');
  document.getElementById('agentProfileBio').textContent = agent.bio;

  const phoneBtn = document.getElementById('agentProfilePhone');
  phoneBtn.href = `tel:+${agent.phone}`;
  phoneBtn.textContent = agent.phoneDisplay;
  const waBtn = document.getElementById('agentProfileWhatsapp');
  waBtn.href = waHref;
  const emailLink = document.getElementById('agentProfileEmail');
  emailLink.href = `mailto:${agent.email}`;
  emailLink.textContent = agent.email;

  document.getElementById('agentListingsHeading').textContent = `Listings by ${agent.name.split(' ')[0]}`;

  // ----- Matching active listings -----
  const allListings = Object.values(window.LISTINGS_DATA || {});
  const matches = allListings.filter(l => l.agent && l.agent.email === agent.email);

  const grid = document.getElementById('agentListingsGrid');
  const noListingsEl = document.getElementById('agentNoListings');

  if (!matches.length) {
    grid.style.display = 'none';
    noListingsEl.style.display = 'block';
  } else {
    grid.innerHTML = matches.map(l => {
      const lWaMessage = `Hi ${agent.name}, I'm interested in ${l.title} (${l.community}, ${l.city}). Could you share more details?`;
      const lWaHref = `https://wa.me/${agent.phone}?text=${encodeURIComponent(lWaMessage)}`;
      return `
      <article class="listing-card reveal in-view" data-listing-id="${l.id}">
        <div class="listing-image">
          <img src="${l.hero}" alt="${l.title}, ${l.community}">
          <div class="card-badges-row">
            <span class="card-badge card-badge--solid">${l.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
            ${l.featured ? '<span class="card-badge card-badge--outline">Featured</span>' : ''}
          </div>
          <a class="card-fav-btn" href="${lWaHref}" target="_blank" rel="noopener" aria-label="Enquire about ${l.title} on WhatsApp">
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
    }).join('');

    grid.querySelectorAll('.listing-card[data-listing-id]').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input, select, textarea')) return;
        window.location.href = `listing-detail.html?id=${card.dataset.listingId}`;
      });
    });
  }

  // ----- Reviews for this agent -----
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function starString(rating) {
    const r = Math.max(0, Math.min(5, Math.round(rating)));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }
  const agentReviews = (window.TESTIMONIALS_DATA || []).filter(t => t.agentId === agent.id);
  const reviewsSection = document.getElementById('agentReviewsSection');
  if (agentReviews.length && reviewsSection) {
    reviewsSection.style.display = '';
    document.getElementById('agentReviewsHeading').textContent = `What Clients Say About ${agent.name.split(' ')[0]}`;
    const avg = agentReviews.reduce((sum, t) => sum + (t.rating || 0), 0) / agentReviews.length;
    document.getElementById('agentReviewsSummary').innerHTML = `
      <span class="reviews-summary-score">${avg.toFixed(1)}</span>
      <span class="reviews-summary-stars">${starString(avg)}</span>
      <span class="reviews-summary-count">${agentReviews.length} review${agentReviews.length === 1 ? '' : 's'}</span>
    `;
    document.getElementById('agentReviewsGrid').innerHTML = agentReviews.map(t => `
      <div class="review-card reveal">
        <div class="review-card-stars">${starString(t.rating)}</div>
        <p class="review-card-text">"${esc(t.reviewText)}"</p>
        <div class="review-card-author">${esc(t.authorName)}</div>
        ${t.authorContext ? `<div class="review-card-context">${esc(t.authorContext)}</div>` : ''}
        ${t.source ? `<div class="review-card-source">via ${esc(t.source)}</div>` : ''}
      </div>`).join('');
  }
})();
