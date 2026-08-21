// Converts real-world latitude/longitude into pixel coordinates on the
// office network-diagram map (see index.html / contact.html .network-diagram
// svg, viewBox "1160 260 900 480"). Calibrated against the actual landmass
// path data in that SVG (see earlier session's map-accuracy fix) using UAE,
// UK and India reference points — accurate to within ~1px for the region
// the map covers (Western Europe through South Asia).
window.projectLatLng = function (lat, lon) {
  const x = (lon + 180) * 7.646572 - 106;
  const y = (90 - lat) * 8.542394;
  return { x, y };
};

// The map's landmass paths only cover the UK -> Middle East -> South Asia
// corridor. A pin outside this rough box will float over blank ocean, so
// callers should treat lat/lng outside it as "don't show on map" (still
// fine to list in office cards).
window.MAP_COVERAGE_BOUNDS = { minLat: 5, maxLat: 62, minLon: -12, maxLon: 92 };

// Shared renderer for the office network-diagram map (used on both
// index.html and contact.html — same office data, same SVG structure).
// Draws gold routes from whichever office is flagged is_hub out to every
// other office with coordinates inside MAP_COVERAGE_BOUNDS.
window.renderOfficeMap = function (offices, routeGroupId, nodeGroupId) {
  const routeGroup = document.getElementById(routeGroupId);
  const nodeGroup = document.getElementById(nodeGroupId);
  if (!routeGroup || !nodeGroup || !window.projectLatLng) return;

  const bounds = window.MAP_COVERAGE_BOUNDS;
  const withCoords = offices.filter(o => o.latitude != null && o.longitude != null);
  const hub = withCoords.find(o => o.isHub) || withCoords[0];
  if (!hub) return;

  const inCoverage = (o) => o.latitude >= bounds.minLat && o.latitude <= bounds.maxLat &&
    o.longitude >= bounds.minLon && o.longitude <= bounds.maxLon;

  const hubPos = window.projectLatLng(hub.latitude, hub.longitude);
  const spokes = withCoords.filter(o => o.id !== hub.id && inCoverage(o));

  let routesHtml = '';
  let nodesHtml = '';

  spokes.forEach((o, i) => {
    const pos = window.projectLatLng(o.latitude, o.longitude);
    const midX = (hubPos.x + pos.x) / 2;
    const midY = (hubPos.y + pos.y) / 2;
    const dist = Math.hypot(pos.x - hubPos.x, pos.y - hubPos.y);
    const lift = Math.min(120, Math.max(12, dist * 0.22));
    const delay = (i * 0.3).toFixed(2);
    routesHtml += `<path class="route" pathLength="1" d="M${hubPos.x.toFixed(2)},${hubPos.y.toFixed(2)} Q${midX.toFixed(2)},${(midY - lift).toFixed(2)} ${pos.x.toFixed(2)},${pos.y.toFixed(2)}" style="animation-delay:${delay}s"/>`;
    const nodeDelay = (1.3 + i * 0.25).toFixed(2);
    nodesHtml += `
      <g class="node" style="animation-delay:${nodeDelay}s">
        <circle cx="${pos.x.toFixed(2)}" cy="${pos.y.toFixed(2)}" r="5"/>
        <text x="${pos.x.toFixed(2)}" y="${(pos.y - 22).toFixed(2)}" text-anchor="middle">${o.mapLabel}</text>
      </g>`;
  });

  nodesHtml += `
    <g class="node node--hub" style="animation-delay:.95s">
      <circle class="pulse" cx="${hubPos.x.toFixed(2)}" cy="${hubPos.y.toFixed(2)}" r="7"/>
      <circle class="hub-dot" cx="${hubPos.x.toFixed(2)}" cy="${hubPos.y.toFixed(2)}" r="7"/>
      <text x="${hubPos.x.toFixed(2)}" y="${(hubPos.y + 41).toFixed(2)}" text-anchor="middle">${hub.mapLabel}</text>
    </g>`;

  routeGroup.innerHTML = routesHtml;
  nodeGroup.innerHTML = nodesHtml;

  const style = document.createElement('style');
  style.textContent = `.network-diagram .node--hub .pulse { transform-origin: ${hubPos.x.toFixed(2)}px ${hubPos.y.toFixed(2)}px; }`;
  document.head.appendChild(style);
};
