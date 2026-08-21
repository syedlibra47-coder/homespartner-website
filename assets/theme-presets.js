// Curated, pre-designed theme options — every palette and font pairing here
// has been chosen for contrast/readability and brand cohesion, so picking
// any combination in the admin panel is guaranteed to look intentional.
// (IBM Plex Mono is kept fixed across all palettes as the site's "data" font
// for prices/specs/coordinates — it's a structural choice, not a theme one.)

window.THEME_PALETTES = {
  "navy-gold": {
    label: "Navy & Gold",
    tokens: {
      "--navy": "#1F275C", "--navy-deep": "#12173D", "--navy-soft": "#2E3878",
      "--gold": "#C9AF6C", "--gold-light": "#E4CE93", "--gold-dark": "#A98A45",
      "--gray": "#787879", "--ink": "#1B1D28",
      "--paper": "#F3EDE3", "--paper-flat": "#FBF8F2", "--line": "#E4DBC9"
    }
  },
  "charcoal-emerald": {
    label: "Charcoal & Emerald",
    tokens: {
      "--navy": "#1C2622", "--navy-deep": "#0F1613", "--navy-soft": "#2B3A34",
      "--gold": "#2F8F6B", "--gold-light": "#5CBA95", "--gold-dark": "#1F6B4D",
      "--gray": "#6B7370", "--ink": "#16201C",
      "--paper": "#EDEFE8", "--paper-flat": "#F7F8F4", "--line": "#DCE0D6"
    }
  },
  "terracotta-cream": {
    label: "Terracotta & Cream",
    tokens: {
      "--navy": "#6B3A2E", "--navy-deep": "#4A2720", "--navy-soft": "#8A5142",
      "--gold": "#D98E4A", "--gold-light": "#F0BC85", "--gold-dark": "#B06B2C",
      "--gray": "#8A7F76", "--ink": "#2E211B",
      "--paper": "#F5EDE3", "--paper-flat": "#FBF6EF", "--line": "#E8D9C8"
    }
  },
  "midnight-rosegold": {
    label: "Midnight & Rose Gold",
    tokens: {
      "--navy": "#221B2E", "--navy-deep": "#150F1E", "--navy-soft": "#362B45",
      "--gold": "#C98B7A", "--gold-light": "#E3B3A5", "--gold-dark": "#A8695A",
      "--gray": "#7A7580", "--ink": "#1E1820",
      "--paper": "#F1E9E7", "--paper-flat": "#FAF5F3", "--line": "#E3D6D2"
    }
  }
};

window.THEME_FONT_PAIRINGS = {
  "fraunces-manrope": {
    label: "Fraunces + Manrope",
    googleFontsUrl: null, // already loaded statically in every page's <head> — no extra request needed
    tokens: { "--font-serif": "'Fraunces', Georgia, serif", "--font-head": "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "--font-body": "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }
  },
  "playfair-inter": {
    label: "Playfair Display + Inter",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap",
    tokens: { "--font-serif": "'Playfair Display', Georgia, serif", "--font-head": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "--font-body": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }
  },
  "dmserif-dmsans": {
    label: "DM Serif Display + DM Sans",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700;800&display=swap",
    tokens: { "--font-serif": "'DM Serif Display', Georgia, serif", "--font-head": "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "--font-body": "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }
  },
  "poppins": {
    label: "Poppins (Modern Sans)",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
    tokens: { "--font-serif": "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "--font-head": "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "--font-body": "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }
  }
};
