---
name: DocuSweep Retro Arcade Clean
colors:
  surface: '#fff8f8'
  surface-dim: '#ead4db'
  surface-bright: '#fff8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0f3'
  surface-container: '#ffe8ef'
  surface-container-high: '#f9e3e9'
  surface-container-highest: '#f3dde4'
  on-surface: '#24181d'
  on-surface-variant: '#5a403f'
  inverse-surface: '#3a2d32'
  inverse-on-surface: '#ffecf1'
  outline: '#8e706e'
  outline-variant: '#e2bebb'
  surface-tint: '#b4262b'
  primary: '#b02429'
  on-primary: '#ffffff'
  primary-container: '#d33e3e'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb3ae'
  secondary: '#ab3047'
  on-secondary: '#ffffff'
  secondary-container: '#fe6f83'
  on-secondary-container: '#700021'
  tertiary: '#755449'
  on-tertiary: '#ffffff'
  tertiary-container: '#906c61'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ae'
  on-primary-fixed: '#410004'
  on-primary-fixed-variant: '#910616'
  secondary-fixed: '#ffdadb'
  secondary-fixed-dim: '#ffb2b9'
  on-secondary-fixed: '#40000f'
  on-secondary-fixed-variant: '#8a1631'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#e8bdaf'
  on-tertiary-fixed: '#2d150d'
  on-tertiary-fixed-variant: '#5e3f35'
  background: '#fff8f8'
  on-background: '#24181d'
  surface-variant: '#f3dde4'
typography:
  headline-xl:
    fontFamily: Space Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Mono
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Mono
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: 0em
  headline-md:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.04em
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-sm:
    fontFamily: Nunito Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 18px
  label-lg:
    fontFamily: Space Mono
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Space Mono
    fontSize: 9px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-mobile: 0.5rem
  margin: 1.25rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style
The design system channels the tactile charm, pixelated kineticism, and energetic nostalgia of late-1990s handheld and arcade systems, recontextualized as a gamified gallery cleanup utility. Document sorting and screenshot purging are framed not as mundane mobile chores, but as rapid-fire arcade mini-games and boss encounters.

The style blends **Neo-Brutalism** and **Chunky 90s Pixel Arcade**:
- Crisp, heavy outer keylines ground every interactive surface.
- Hard, unblurred offset drop-shadows provide tactile snap without blur.
- High-saturation pastel backdrops offset high-stakes action items (Tomato Red and Bubblegum Pink against Warm Cream).
- Micro-interactions simulate physical click-down triggers, retro 8-bit health bars, and collectible sticker stamps.

## Colors
The palette balances energetic arcade urgency with soft vintage warmth to prevent utility fatigue:
- **Primary (`#D94242` - Tomato Red):** High-stakes destructive actions, primary "SWEEP / PURGE" actions, arcade trigger buttons, critical health bars, and combo indicators.
- **Secondary (`#F06478` - Bubblegum Pink):** Playful highlights, quest card headers, XP gain tickers, active state badges, and secondary action levers.
- **Tertiary (`#F2C6B8` - Peach):** Container backgrounds, card surfaces, table headers, and selectable item tiles.
- **Neutral (`#32252A` - Dark Ink):** High-contrast keyline borders, structural shadows, pixel typography, icons, and system HUD dividers. Never use pure black (`#000000`).
- **Base Canvas (`#F7E8D4` - Warm Cream):** Application foundation, modal underlays, and peripheral negative space.
- **Subtle Surface (`#F5D9D9` - Pale Rose):** Inset wells, disabled item containers, and unselected filter chips.

## Typography
To ensure readability while retaining nostalgic arcade grit:
- **Headlines & HUD Tickers:** Handled by a geometric monospace (`Space Mono`) styled in uppercase with tight tracking for arcade metrics, boss countdowns, cleared megabytes, and scores.
- **Body & Metadata:** Set in `Nunito Sans` (SemiBold and Bold weights only). High legibility ensures instant recognition of file sizes, dates, and preview meta.
- **Labels & Micro-Tags:** Set in all-caps `Space Mono` to mimic pixelated badge tags, item rarities, and machine status stamps.

## Layout & Spacing
The layout follows a mobile-first, vertical hand-held console viewport model:
- **Margins & Gutters:** Strict 16px (`1rem`) outer margin on mobile, keeping cards comfortably bounded within Android touch margins and hardware safe-areas.
- **Thumb Zone Layout:** Primary batch actions ("SWEEP", "KEEP", "REVIEW") anchor to the bottom 120px viewport container with minimum touch targets of 48x48dp.
- **Grid Structure:** Photo and document tiles sit on a strict 2-column or 3-column fluid grid with rigid 8px (`0.5rem`) gaps.
- **HUD Header:** Fixed top screen shelf housing the stage progress bar, megabyte counter, and combo streak ticker.

## Elevation & Depth
Depth is strictly mechanical and graphic—soft gaussian blurs are prohibited:
- **Hard Offset Shadow:** All cards, floating buttons, and badges leverage a directional, hard-edge drop shadow: `3px 3px 0px #32252A` (or `2px 2px 0px #32252A` for small chips).
- **Physical Depression:** When pressed or activated, components translate `transform: translate(2px, 2px)` while their shadow collapses to `1px 1px 0px #32252A`, delivering a physical mechanical switch feedback.
- **Borders & Keylines:** Elements carry a mandatory `2.5px solid #32252A` border.
- **Checkerboard Accents:** Top bars and modal headers feature a 4px alternating two-tone checkerboard divider strip (`#32252A` and `#F7E8D4`) creating vintage game cartridge housing cues.

## Shapes
Surfaces use tight, compact bevels (`0.25rem` / `4px`) rather than pill-capsules or complete roundness. This maintains a chunky, molded plastic cartridge feeling while softening aggressive raw brutalism:
- Standard cards, buttons, and alert modules: `rounded` (4px).
- Inset progress bars, thumbnail wrappers, and item tiles: `rounded-sm` (2px).
- Floating Arcade CTA buttons: `rounded-lg` (8px max) to emulate rubberized game-controller d-pads and action buttons.

## Components

### Arcade Buttons
- **Primary Action (Sweep / Destroy):** Background Tomato Red (`#D94242`), text Warm Cream (`#F7E8D4`), border `2.5px solid #32252A`, box shadow `3px 3px 0px #32252A`. Text uppercase `Space Mono` bold.
- **Secondary (Keep / Skip):** Background Peach (`#F2C6B8`), text Dark Ink (`#32252A`), border `2.5px solid #32252A`, box shadow `3px 3px 0px #32252A`.
- **Active State:** Translation `translate(2px, 2px)` with shadow reduced to `1px 1px 0px #32252A`.

### Document & Photo Cards
- Surface: Peach (`#F2C6B8`) with a Pale Rose (`#F5D9D9`) image preview slot.
- Bounded by a `2px solid #32252A` border and `3px 3px 0px #32252A` hard shadow.
- Top-right corner includes a retro pixel status stamp (e.g., "DUPLICATE", "BLURRY", "RECEIPT") styled with high-contrast inverted tags.

### Retro Checkboxes & Selectors
- Custom 20x20dp squares with a `2px solid #32252A` stroke.
- Unchecked: Warm Cream (`#F7E8D4`).
- Checked: Tomato Red (`#D94242`) filling with an inverted pixelated checkmark graphic.

### Pixelated Progress Bars
- Height: 16dp container with Warm Cream background and `2px solid #32252A` outer border.
- Inner bar: Stepped segment blocks filled with Bubblegum Pink (`#F06478`) or Tomato Red (`#D94242`), advancing in visible stepped chunks to simulate battery/health level gauges.

### Game HUD Chips
- Background: Warm Cream (`#F7E8D4`) or Pale Rose (`#F5D9D9`).
- Border: `1.5px solid #32252A`.
- Typographic content: `Space Mono` uppercase tracking displaying metrics like `XP +250`, `CLEARED: 1.2GB`, or `STREAK x4`.