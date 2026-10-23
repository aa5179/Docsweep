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
    text: '#25234A',
    tint: '#5547C8',

    // Core surfaces
    background: '#F7F6F2',
    foreground: '#25234A',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#25234A',

    // Primary action color (buttons, links, active states)
    primary: '#5547C8',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#ECEAFB',
    secondaryForeground: '#393467',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EFEEE9',
    mutedForeground: '#77758A',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#F8E9DD',
    accentForeground: '#74452F',

    // Destructive actions (delete, error states)
    destructive: '#C7434D',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#E4E1DA',
    input: '#E4E1DA',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
