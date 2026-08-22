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
    grid.innerHTML = matches.map(l => `
      <article class="listing-card reveal in-view" data-listing-id="${l.id}">
        <div class="listing-image">
          <img src="${l.hero}" alt="${l.title}, ${l.community}">
          <span class="badge ${l.type === 'sale' ? 'badge--gold' : 'badge--navy'} listing-tag">${l.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
          <div class="dots"><span class="dot active"></span><span class="dot"></span><span class="dot"></span></div>
        </div>
        <div class="listing-body">
          <div class="pill-row"><span class="pill">${l.tags[0] || l.category}</span><span class="pill">${l.tags[1] || l.category}</span></div>
          <div class="listing-price">${l.priceLabel}${l.priceSuffix ? ` <span>${l.priceSuffix}</span>` : ''}</div>
          <h3>${l.title}</h3>
          <p class="listing-location">${l.community}, ${l.city}</p>
          <div class="listing-meta"><span><svg viewBox="0 0 24 24" fill="none"><path d="M3 19v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 19h18M6 11V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>${l.beds === 'Studio' ? 'Studio' : l.beds + ' Beds'}</span><span><svg viewBox="0 0 24 24" fill="none"><path d="M4 12h16M6 12V6a2 2 0 0 1 2-2h1M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>${l.baths} Baths</span><span><svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 8.5h17M8.5 3.5v17" stroke="currentColor" stroke-width="1.8"/></svg>${l.sqft} sqft</span></div>
          <div class="listing-footer">
            <a href="listing-detail.html?id=${l.id}" class="card-link">View Details &rarr;</a>
          </div>
        </div>
      </article>`).join('');

    grid.querySelectorAll('.listing-card[data-listing-id]').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input, select, textarea')) return;
        window.location.href = `listing-detail.html?id=${card.dataset.listingId}`;
      });
    });
  }
})();
