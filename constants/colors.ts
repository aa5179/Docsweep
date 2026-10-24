/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#32252A',
    tint: '#D94242',

    // Core surfaces
    background: '#FFF8F8',
    foreground: '#24181D',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#24181D',

    // Primary action color (buttons, links, active states)
    primary: '#B02429',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#F9E3E9',
    secondaryForeground: '#24181D',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#FFE8EF',
    mutedForeground: '#5A403F',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#FE6F83',
    accentForeground: '#24181D',

    // Destructive actions (delete, error states)
    destructive: '#B02429',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#24181D',
    input: '#24181D',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
