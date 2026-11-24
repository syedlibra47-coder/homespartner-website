(async function () {
  if (window.dataReady) await window.dataReady;

  const grid = document.getElementById('offplanListingsGrid');
  if (!grid || !window.OFFPLAN_DATA) return;

  const WHATSAPP_NUMBER = (window.CONTACT_CONTENT_DATA && window.CONTACT_CONTENT_DATA.whatsappNumber) || '971500000000';

  const projects = Object.values(window.OFFPLAN_DATA);

  function unitRangeLabel(unitTypes) {
    if (!unitTypes || !unitTypes.length) return '';
    const first = unitTypes[0].type, last = unitTypes[unitTypes.length - 1].type;
    return first === last ? first : `${first} – ${last}`;
  }

  const statusBtns = document.querySelectorAll('#offplanStatusFilter .filter-btn');
  const typeSelect = document.getElementById('offplanTypeFilter');
  const developerSelect = document.getElementById('offplanDeveloperFilter');
  const planSelect = document.getElementById('offplanPlanFilter');
  const keywordInput = document.getElementById('offplanKeywordFilter');
  const resultsCount = document.getElementById('offplanResultsCount');
  const emptyState = document.getElementById('offplanEmptyState');
  const resetBtn = document.getElementById('offplanFilterReset');
  let activeStatus = 'all';

  // ----- Apply filters handed off from the homepage search (?category=&q=) -----
  function normalizeWord(s) { return s.trim().toLowerCase().replace(/s$/, ''); }
  function matchSelectOption(select, rawValue) {
    if (!rawValue) return null;
    const target = normalizeWord(rawValue);
    const opt = [...select.options].find(o => normalizeWord(o.value) === target || normalizeWord(o.textContent) === target);
    return opt ? opt.value : null;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const pCategory = urlParams.get('category');
  const pKeyword = urlParams.get('q');

  // populate developer filter dynamically
  const developers = [...new Set(projects.map(p => p.developer))].sort();
  developers.forEach(dev => {
    const opt = document.createElement('option');
    opt.value = dev;
    opt.textContent = dev;
    developerSelect.appendChild(opt);
  });

  if (pCategory) {
    const matched = matchSelectOption(typeSelect, pCategory);
    if (matched) typeSelect.value = matched;
  }
  if (pKeyword) keywordInput.value = pKeyword;

  function cardHtml(p) {
    const planLabel = p.paymentPlans[0].label;
    const waMessage = `Hi, I'm interested in ${p.title} (${p.community}). Could you share more details?`;
    const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;
    return `
    <article class="offplan-card reveal in-view" data-status="${p.status}" data-category="${p.category}" data-developer="${p.developer}" data-plan="${p.paymentPlans[0].segments[0].pct}" data-search="${(p.title + ' ' + p.community + ' ' + p.developer).toLowerCase()}" onclick="window.location.href='offplan-detail.html?id=${p.id}'">
      <div class="offplan-card-image">
        <img src="${p.hero}" alt="${p.title}, ${p.community}">
        <div class="card-badges-row">
          <span class="card-badge card-badge--solid">${p.status}</span>
          <span class="card-badge card-badge--outline">${planLabel} Plan</span>
        </div>
        <a class="card-fav-btn" href="${waHref}" target="_blank" rel="noopener" aria-label="Enquire about ${p.title} on WhatsApp" onclick="event.stopPropagation()">
          <img src="assets/WhatsApp.svg.webp" alt="">
        </a>
        <div class="listing-overlay">
          <p class="listing-overlay-eyebrow">${p.community}</p>
          <h3 class="listing-overlay-title">${p.title}</h3>
          <p class="listing-overlay-sub">By ${p.developer}</p>
        </div>
      </div>
      <div class="offplan-card-body">
        <div class="listing-specs">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 19v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 19h18M6 11V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>${unitRangeLabel(p.unitTypes)}</span>
          <span>Handover ${p.handover}</span>
        </div>
        <div class="listing-price-row">
          <span class="listing-price-tag">from ${p.priceLabel}</span>
          <a href="offplan-detail.html?id=${p.id}" class="listing-view-link" onclick="event.stopPropagation()">Discover More &rarr;</a>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const type = typeSelect.value;
    const developer = developerSelect.value;
    const plan = planSelect.value;
    const keyword = keywordInput.value.trim().toLowerCase();

    const filtered = projects.filter(p => {
      const matchesStatus = activeStatus === 'all' || p.status === activeStatus;
      const matchesType = type === 'all' || p.category === type;
      const matchesDeveloper = developer === 'all' || p.developer === developer;
      const matchesPlan = plan === 'all' || String(p.paymentPlans[0].segments[0].pct) === plan;
      const matchesKeyword = !keyword || (p.title + ' ' + p.community + ' ' + p.developer).toLowerCase().includes(keyword);
      return matchesStatus && matchesType && matchesDeveloper && matchesPlan && matchesKeyword;
    });

    grid.innerHTML = filtered.map(cardHtml).join('');
    resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'project' : 'projects'}`;
    emptyState.classList.toggle('is-visible', filtered.length === 0);
  }

  statusBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      statusBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatus = btn.dataset.filter;
      render();
    });
  });
  typeSelect.addEventListener('change', render);
  developerSelect.addEventListener('change', render);
  planSelect.addEventListener('change', render);
  keywordInput.addEventListener('input', render);

  function resetAll() {
    statusBtns.forEach(b => b.classList.remove('active'));
    statusBtns[0].classList.add('active');
    activeStatus = 'all';
    typeSelect.value = 'all';
    developerSelect.value = 'all';
    planSelect.value = 'all';
    keywordInput.value = '';
    render();
  }
  resetBtn.addEventListener('click', resetAll);
  document.querySelectorAll('[data-mirror-reset]').forEach(btn => btn.addEventListener('click', resetAll));

  render();
})();
