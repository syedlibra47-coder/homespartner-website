// Shared icon set for Services — used by admin.js (icon picker) and by
// services.html / homepage service cards to render the chosen icon.
// All icons share a 0 0 48 48 viewBox, stroke-width 2.5, round caps/joins.
window.ICON_LIBRARY = {
  home: '<path d="M8 22 24 8l16 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 20v18h24V20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 38v-10h8v10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  calendar: '<rect x="9" y="12" width="30" height="26" rx="2" stroke="currentColor" stroke-width="2.5"/><path d="M9 20h30" stroke="currentColor" stroke-width="2.5"/><path d="M17 12V8M31 12V8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="17" cy="29" r="2" fill="currentColor"/><circle cx="24" cy="29" r="2" fill="currentColor"/><circle cx="31" cy="29" r="2" fill="currentColor"/>',
  sign: '<path d="M24 44V20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="10" y="8" width="28" height="14" rx="2" stroke="currentColor" stroke-width="2.5"/><path d="M16 15h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  blueprint: '<path d="M24 6 6 16v6h36v-6L24 6Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M10 22v16M18 22v16M30 22v16M38 22v16" stroke="currentColor" stroke-width="2.5"/><path d="M6 42h36" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  clock: '<circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="2.5"/><path d="M24 15v9l6 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  wrench: '<path d="M33 8a9 9 0 0 0-11.8 11.8L9 32l7 7 12.2-12.2A9 9 0 0 0 40 15l-6.5 6.5-5-5L34.5 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  key: '<circle cx="16" cy="24" r="8" stroke="currentColor" stroke-width="2.5"/><path d="M24 24h16M34 24v6M40 24v4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  shield: '<path d="M24 6l14 5v11c0 9-6 15-14 18-8-3-14-9-14-18V11l14-5Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 24l4 4 8-8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  chart: '<path d="M6 40h36" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="10" y="28" width="6" height="12" stroke="currentColor" stroke-width="2.5"/><rect x="21" y="20" width="6" height="20" stroke="currentColor" stroke-width="2.5"/><rect x="32" y="12" width="6" height="28" stroke="currentColor" stroke-width="2.5"/>',
  document: '<path d="M14 6h14l8 8v28H14V6Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 6v8h8" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 26h12M18 32h12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  pin: '<path d="M24 42s12-11 12-20a12 12 0 1 0-24 0c0 9 12 20 12 20Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><circle cx="24" cy="22" r="4" stroke="currentColor" stroke-width="2.5"/>',
  star: '<path d="M24 6l5.5 11.5L42 19l-9 8.8 2.1 12.2L24 34l-11.1 6 2.1-12.2L6 19l12.5-1.5L24 6Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>'
};

window.ICON_LIBRARY_LABELS = {
  home: 'House', calendar: 'Calendar', sign: 'For-Sale Sign', blueprint: 'Blueprint',
  clock: 'Clock', wrench: 'Wrench', key: 'Key', shield: 'Shield', chart: 'Growth Chart',
  document: 'Document', pin: 'Location Pin', star: 'Star'
};
