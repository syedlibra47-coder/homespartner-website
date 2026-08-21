(async function () {
  if (window.dataReady) await window.dataReady;

  const jumpNav = document.getElementById('serviceJumpInner');
  const container = document.getElementById('serviceSectionsContainer');
  if (!jumpNav || !container || !window.SERVICES_DATA) return;

  const services = [...window.SERVICES_DATA].sort((a, b) => a.sortOrder - b.sortOrder);

  jumpNav.innerHTML = services.map(s => `<a href="#${s.id}">${s.title}</a>`).join('');

  container.innerHTML = services.map((s, i) => {
    const iconSvg = (window.ICON_LIBRARY && window.ICON_LIBRARY[s.icon]) || (window.ICON_LIBRARY && window.ICON_LIBRARY.home) || '';
    return `
    <section class="service-detail${i % 2 === 1 ? ' service-detail--alt' : ''}" id="${s.id}">
      <div class="container service-detail-inner">
        <div class="service-detail-icon">
          <svg viewBox="0 0 48 48" fill="none">${iconSvg}</svg>
        </div>
        <div class="service-detail-body">
          <p class="eyebrow eyebrow--dark">${s.title}</p>
          <h2 class="display">${s.pageHeading}</h2>
          <p>${s.pageDescription}</p>
          <ul class="service-checklist">
            ${s.checklist.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <a href="${s.ctaHref}" class="btn btn-navy">${s.ctaLabel} &rarr;</a>
        </div>
      </div>
    </section>`;
  }).join('');
})();
