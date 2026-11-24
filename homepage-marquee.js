// Scrolling strip of the real communities HomesPartner is active in — each
// one links to its area guide. Static list (not pulled from listings) since
// this is meant to always show our core coverage areas, not whatever happens
// to have active inventory today.
(function () {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;

  const communities = [
    { name: 'Dubai Marina', slug: 'dubai-marina-area-guide' },
    { name: 'Downtown Dubai', slug: 'downtown-dubai-area-guide' },
    { name: 'Business Bay', slug: 'business-bay-area-guide' },
    { name: 'Palm Jumeirah', slug: 'palm-jumeirah-area-guide' },
    { name: 'Jumeirah Lake Towers', slug: 'jumeirah-lake-towers-area-guide' },
    { name: 'Jumeirah Village Circle', slug: 'jumeirah-village-circle-area-guide' },
    { name: 'Dubai Creek Harbour', slug: 'dubai-creek-harbour-area-guide' }
  ];

  const diamond = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10z"></path></svg>';
  const itemsHtml = communities.map(c =>
    `<a class="marquee-item" href="custom-page.html?slug=${c.slug}">${c.name}${diamond}</a>`
  ).join('');

  // doubled so the -50% translateX loop point is seamless
  track.innerHTML = itemsHtml + itemsHtml;
})();
