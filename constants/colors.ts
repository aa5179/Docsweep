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
    background: '#F7E8D4',
    foreground: '#32252A',

    // Cards / elevated surfaces
    card: '#FFF8F8',
    cardForeground: '#32252A',

    // Primary action color (buttons, links, active states)
    primary: '#D94242',
    primaryForeground: '#F7E8D4',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#F5D9D9',
    secondaryForeground: '#32252A',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#F2C6B8',
    mutedForeground: '#71565A',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#F06478',
    accentForeground: '#32252A',

    // Destructive actions (delete, error states)
    destructive: '#D94242',
    destructiveForeground: '#F7E8D4',

    // Borders and input outlines
    border: '#32252A',
    input: '#32252A',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
