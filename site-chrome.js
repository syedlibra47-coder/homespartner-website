(async function () {
  if (window.dataReady) await window.dataReady;

  const c = window.SITE_CHROME_DATA;
  if (!c) return;

  const currentPage = (location.pathname.split('/').pop() || 'index.html');
  const isHome = currentPage === 'index.html' || currentPage === '';

  // On the homepage itself, "index.html#anchor" links should become same-page
  // anchors ("#anchor") so they smooth-scroll instead of reloading the page.
  const resolveHref = (href) => {
    if (isHome && href.indexOf('index.html') === 0) {
      return href.slice('index.html'.length) || '#top';
    }
    return href;
  };

  const isActive = (href) => href.indexOf('#') === -1 && href === currentPage;

  // ----- Header brand logo link -----
  const brandLink = document.getElementById('brandLink');
  if (brandLink) brandLink.href = resolveHref('index.html#top');

  // ----- Main nav -----
  const mainNav = document.getElementById('mainNav');
  if (mainNav) {
    const primaryLinks = (c.navLinks || []).map(l =>
      `<a href="${resolveHref(l.href)}"${isActive(l.href) ? ' class="is-active"' : ''}>${l.label}</a>`
    ).join('');

    const submenuLinks = (c.whyusSubmenu || []).map(l =>
      `<a href="${resolveHref(l.href)}"${isActive(l.href) ? ' class="is-active"' : ''}>${l.label}</a>`
    ).join('');

    const whyUs = `
      <div class="nav-dropdown">
        <a href="${resolveHref(c.whyusHref)}">${c.whyusLabel}</a>
        <div class="nav-dropdown-menu">${submenuLinks}</div>
      </div>`;

    const contactLink = `<a href="${resolveHref(c.contactHref)}"${isActive(c.contactHref) ? ' class="is-active"' : ''}>${c.contactLabel}</a>`;

    mainNav.innerHTML = primaryLinks + whyUs + contactLink;
  }

  // ----- Header CTA button -----
  const ctaBtn = document.getElementById('headerCtaBtn');
  if (ctaBtn) {
    ctaBtn.href = resolveHref(c.ctaHref);
    ctaBtn.textContent = c.ctaText;
  }

  // ----- Footer brand -----
  const footerBlurb = document.getElementById('footerBlurb');
  if (footerBlurb) footerBlurb.textContent = c.footerBlurb;

  const footerEmail = document.getElementById('footerEmail');
  if (footerEmail) {
    footerEmail.textContent = c.footerEmail;
    footerEmail.href = 'mailto:' + c.footerEmail;
  }

  // ----- Footer columns -----
  const footerColumns = document.getElementById('footerColumns');
  if (footerColumns && c.footerColumns) {
    footerColumns.innerHTML = c.footerColumns.map(col => `
      <div class="footer-col">
        <h5>${col.heading}</h5>
        ${(col.links || []).map(l => `<a href="${resolveHref(l.href)}">${l.label}</a>`).join('')}
      </div>`).join('');
  }

  // ----- Footer copyright -----
  const footerCopyright = document.getElementById('footerCopyright');
  if (footerCopyright) footerCopyright.textContent = c.footerCopyright;
})();
