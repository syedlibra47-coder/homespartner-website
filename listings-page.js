(async function () {
  if (window.dataReady) await window.dataReady;

  const grid = document.getElementById('allListingsGrid');
  if (!grid || !window.LISTINGS_DATA) return;

  const WHATSAPP_NUMBER = '971500000000';
  const listings = Object.values(window.LISTINGS_DATA);

  const statusBtns = document.querySelectorAll('#allListingsStatus .filter-btn');
  const typeSelect = document.getElementById('filterType');
  const bedsSelect = document.getElementById('filterBeds');
  const keywordInput = document.getElementById('filterKeyword');
  const resultsCount = document.getElementById('filterResultsCount');
  const emptyState = document.getElementById('filterEmptyState');
  const resetBtn = document.getElementById('filterReset');
  let activeStatus = 'all';

  // ----- Apply filters handed off from the homepage search (?status=&category=&beds=&q=) -----
  function normalizeWord(s) { return s.trim().toLowerCase().replace(/s$/, ''); }
  function matchSelectOption(select, rawValue) {
    if (!rawValue) return null;
    const target = normalizeWord(rawValue);
    const opt = [...select.options].find(o => normalizeWord(o.value) === target || normalizeWord(o.textContent) === target);
    return opt ? opt.value : null;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const pStatus = urlParams.get('status');
  const pCategory = urlParams.get('category');
  const pBeds = urlParams.get('beds');
  const pKeyword = urlParams.get('q');
  if (pStatus === 'sale' || pStatus === 'rent') {
    statusBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === pStatus));
    activeStatus = pStatus;
  }
  if (pCategory) {
    const matched = matchSelectOption(typeSelect, pCategory);
    if (matched) typeSelect.value = matched;
  }
  if (pBeds && ['0', '1', '2', '3', '4'].includes(pBeds)) bedsSelect.value = pBeds;
  if (pKeyword) keywordInput.value = pKeyword;

  function bedsFilterValue(beds) {
    if (beds === 'Studio') return '0';
    const n = parseInt(beds, 10);
    return n >= 4 ? '4' : String(n);
  }

  function cardHtml(l) {
    const waMessage = `Hi, I'm interested in ${l.title} (${l.community}, ${l.city}). Could you share more details?`;
    const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;
    return `
    <article class="listing-card reveal in-view" data-type="${l.type}" data-category="${l.category.toLowerCase()}" data-beds="${bedsFilterValue(l.beds)}" data-search="${(l.title + ' ' + l.community + ' ' + l.city + ' ' + l.category).toLowerCase()}" data-listing-id="${l.id}">
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
        <div class="listing-meta"><span>${l.beds === 'Studio' ? 'Studio' : l.beds + ' Beds'}</span><span>${l.baths} Baths</span><span>${l.sqft} sqft</span></div>
        <div class="listing-footer">
          <a href="listing-detail.html?id=${l.id}" class="card-link">View Details &rarr;</a>
          <a class="whatsapp-btn whatsapp-btn--inline" href="${waHref}" target="_blank" rel="noopener" aria-label="Enquire about ${l.title} on WhatsApp">
            <img src="assets/WhatsApp.svg.webp" alt="WhatsApp">
          </a>
        </div>
      </div>
    </article>`;
  }

  function applyFilters() {
    const type = typeSelect.value;
    const beds = bedsSelect.value;
    const keyword = keywordInput.value.trim().toLowerCase();

    const filtered = listings.filter(l => {
      const matchesStatus = activeStatus === 'all' || l.type === activeStatus;
      const matchesType = type === 'all' || l.category.toLowerCase() === type;
      const matchesBeds = beds === 'all' || bedsFilterValue(l.beds) === beds;
      const matchesKeyword = !keyword || (l.title + ' ' + l.community + ' ' + l.city + ' ' + l.category).toLowerCase().includes(keyword);
      return matchesStatus && matchesType && matchesBeds && matchesKeyword;
    });

    grid.innerHTML = filtered.map(cardHtml).join('');
    resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'property' : 'properties'}`;
    emptyState.classList.toggle('is-visible', filtered.length === 0);

    grid.querySelectorAll('.listing-card[data-listing-id]').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input, select, textarea')) return;
        window.location.href = `listing-detail.html?id=${card.dataset.listingId}`;
      });
    });
  }

  statusBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      statusBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatus = btn.dataset.filter;
      applyFilters();
    });
  });
  typeSelect.addEventListener('change', applyFilters);
  bedsSelect.addEventListener('change', applyFilters);
  keywordInput.addEventListener('input', applyFilters);

  function resetAll() {
    statusBtns.forEach(b => b.classList.remove('active'));
    statusBtns[0].classList.add('active');
    activeStatus = 'all';
    typeSelect.value = 'all';
    bedsSelect.value = 'all';
    keywordInput.value = '';
    applyFilters();
  }
  resetBtn.addEventListener('click', resetAll);
  document.querySelectorAll('[data-mirror-reset]').forEach(btn => btn.addEventListener('click', resetAll));

  applyFilters();
})();
