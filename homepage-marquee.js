// Scrolling strip of well-known Dubai developers — informational context for
// the off-plan section above (the market these launches come from), not a
// claim of exclusive partnership with any of them. Shows a developer's logo
// (uploaded via admin) when one is set, otherwise falls back to its name.
(async function () {
  if (window.dataReady) await window.dataReady;

  const track = document.getElementById('marqueeTrack');
  if (!track) return;

  const fallbackDevelopers = [
    { name: 'Emaar Properties', logoUrl: 'assets/logos/emaar.png' },
    { name: 'DAMAC Properties', logoUrl: 'assets/logos/damac.png' },
    { name: 'Sobha Realty', logoUrl: 'assets/logos/sobha.png' },
    { name: 'Binghatti', logoUrl: 'assets/logos/binghatti.png' },
    { name: 'Danube Properties', logoUrl: 'assets/logos/danube.png' },
    { name: 'Azizi Developments', logoUrl: 'assets/logos/azizi.png' }
  ];

  const configured = (window.HOMEPAGE_CONTENT_DATA && window.HOMEPAGE_CONTENT_DATA.developers) || [];
  const developers = configured.length ? configured : fallbackDevelopers;

  const diamond = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10z"></path></svg>';
  const itemsHtml = developers.map(d => {
    const content = d.logoUrl
      ? `<img src="${d.logoUrl}" alt="${d.name || ''}" loading="lazy">`
      : d.name;
    return `<span class="marquee-item${d.logoUrl ? ' marquee-item--logo' : ''}">${content}${diamond}</span>`;
  }).join('');

  // doubled so the -50% translateX loop point is seamless
  track.innerHTML = itemsHtml + itemsHtml;
})();
