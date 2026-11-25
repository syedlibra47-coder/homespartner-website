// Scrolling strip of well-known Dubai developers — informational context for
// the off-plan section above (the market these launches come from), not a
// claim of exclusive partnership with any of them.
(function () {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;

  const developers = [
    'Emaar Properties',
    'DAMAC Properties',
    'Nakheel',
    'Sobha Realty',
    'Binghatti',
    'Danube Properties',
    'Azizi Developments',
    'Meraas'
  ];

  const diamond = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10z"></path></svg>';
  const itemsHtml = developers.map(name =>
    `<span class="marquee-item">${name}${diamond}</span>`
  ).join('');

  // doubled so the -50% translateX loop point is seamless
  track.innerHTML = itemsHtml + itemsHtml;
})();
