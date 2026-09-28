---
name: Mythic Tabletop Dual-Engine
colors:
  surface: '#161310'
  surface-dim: '#161310'
  surface-bright: '#3d3835'
  surface-container-lowest: '#110e0b'
  surface-container-low: '#1e1b18'
  surface-container: '#221f1c'
  surface-container-high: '#2d2926'
  surface-container-highest: '#383430'
  on-surface: '#e9e1db'
  on-surface-variant: '#d1c5b2'
  inverse-surface: '#e9e1db'
  inverse-on-surface: '#34302c'
  outline: '#9a8f7e'
  outline-variant: '#4e4637'
  surface-tint: '#ebc166'
  primary: '#ebc166'
  on-primary: '#402d00'
  primary-container: '#c9a24b'
  on-primary-container: '#4f3900'
  inverse-primary: '#795902'
  secondary: '#7bdb81'
  on-secondary: '#00390f'
  secondary-container: '#017327'
  on-secondary-container: '#94f699'
  tertiary: '#64d4f8'
  on-tertiary: '#003543'
  tertiary-container: '#3db5d8'
  on-tertiary-container: '#004353'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf9e'
  primary-fixed-dim: '#ebc166'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#5b4300'
  secondary-fixed: '#97f89b'
  secondary-fixed-dim: '#7bdb81'
  on-secondary-fixed: '#002106'
  on-secondary-fixed-variant: '#00531a'
  tertiary-fixed: '#b6ebff'
  tertiary-fixed-dim: '#64d4f8'
  on-tertiary-fixed: '#001f28'
  on-tertiary-fixed-variant: '#004e60'
  background: '#161310'
  on-background: '#e9e1db'
  surface-variant: '#383430'
typography:
  display-titan:
    fontFamily: Noto Serif
    fontSize: 84px
    fontWeight: '700'
    lineHeight: 84px
    letterSpacing: -0.02em
  display-titan-mobile:
    fontFamily: Noto Serif
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: 0.04em
  headline-md:
    fontFamily: Noto Serif
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0.03em
  headline-sm:
    fontFamily: Noto Serif
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 22px
  label-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  numeral-counter:
    fontFamily: Noto Serif
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style
This design system defines an authoritative, artifact-grade tabletop companion tailored for adversarial tactical calculation. Built expressly for face-to-face tabletop conflict, the interface evokes the tactile weight of an ancient tactical codex—dark stone, etched papyrus, weathered metals, and divine alignment—rendered with razor-sharp modern precision.

The emotional atmosphere is strategic, solemn, and mythic. Visual elements eschew cartoonish fantasy tropes and realistic photographic cutouts in favor of geometric runic precision, parchment micro-textures, and high-legibility typographic hierarchies. Every interactive zone communicates mechanical trust, physical weight, and instant cross-table readability under dim game-room lighting.

## Colors
The palette is structured around an ultra-deep charcoal-umber base with three civilization affinities and calibrated surface elevations:

- **Ecosystem Bases:**
  - Canvas Background: `#14110E` (Earthy deep obsidian)
  - Surface Default: `#1E1A16` (Low-lit leather/slate)
  - Surface Container Low: `#26211C` (Layered slab)
  - Surface Container High: `#332B25` (Raised operational tiles)
- **Text & Glyph Hierarchy:**
  - Primary Text: `#F3EBDD` (Bleached bone parchment, 100% contrast)
  - Muted Text / Inactive Inscriptions: `#A89F90` (Aged stone dust)
- **Civilization Faction Accents:**
  - **Egipto:** `#C9A24B` (Sand Gold / Sun Chariot). Used for default primary controls, critical results, and shared artifacts.
  - **Griegos:** `#4FAE5A` (Olive Green / Laurel). Used for Greek affinity modifiers, heroic counters, and phalanx states.
  - **Nórdicos:** `#3FB6D9` (Runic Cyan / Glacial Frost). Used for Norse blessings, berserk tallies, and runic dice states.
- **Structural Trims:**
  - Gold Filigree Border: `rgba(201, 162, 75, 0.2)` default, stepping up to `#C9A24B` on engagement.
  - Divider Strips: Solid `#14110E` flanked by dual hairline borders of `rgba(201, 162, 75, 0.35)`.

## Typography
Typographic scale enforces immediate separation between mythic outcome readouts and utilitarian operational data.

- **Display & Battle Totals (Noto Serif):** Classical, chiseled, serif construction used for outcome totals, civilization titles, and raw combat powers. The gigantic totals scale between `72px` and `84px` with tabular numeral alignment so cross-table players can digest 2d6 tallies in a fraction of a second without visual jitter.
- **Mechanical Body & Interface Controls (Inter):** Highly legible, neutral sans-serif construction for counter controls, unit tags, faction buffs, and status flags. Never render operational labels under `14px` or body text under `16px` to maintain strict legibility under oblique seated angles.
- **Letter Spacing:** All Noto Serif uppercase titles must employ deliberate positive tracking (`+0.04em` to `+0.08em`) to mirror stone inscriptions.

## Layout & Spacing
The layout adheres to a fixed, dual-facing 390x844 mobile viewport engineered specifically for face-to-face tabletop positioning:

- **Split View Geometry (Mirrored Opponents):**
  - **Player 1 Territory (Facing North):** Top block spans 378px height, rotated precisely 180 degrees.
  - **Neutral Trench (Center Strip):** Spans 88px fixed height across the absolute center. Houses the master resolution triggers, shared phase indicators, and round logs.
  - **Player 2 Territory (Facing South):** Bottom block spans 378px height in standard upright orientation.
- **Grid & Gutters:** Internal player zones utilize a flexible 4-column module separated by tight `0.75rem` (12px) gutters to maximize the touch targets of combat dials and shape selectors.
- **Edge Boundaries:** Screen boundaries use a strict `1rem` (16px) margin to keep elements clear of physical screen bezels and player finger rests.

## Elevation & Depth
Depth avoids artificial blur spreads and floating dropshadows, leaning instead into tactile, incised, and relief stone-carving metaphors:

- **Surface Tiers:**
  - Flat Board (`#14110E`): The foundational table stratum.
  - Sunk Containers (`#1E1A16` with interior hairline border `rgba(0,0,0,0.6)`): Carved basins for holding unit pools and dice values.
  - Raised Plinths (`#26211C` to `#332B25`): Interactive unit tiles, counters, and buttons.
- **Hairline Accent Trims:** Visual elevation is articulated via crisp `1px` inner and outer borders using civilization gold (`#C9A24B33`) or respective faction colors.
- **Engraved Inset Shadows:** Slotted counters and dice wells use `inset 0 2px 4px rgba(0, 0, 0, 0.7)` to emulate chiseled indentations in stone.
- **Pressed Tactility:** Active presses trigger an instant `scale(0.97)` alongside an inset inner glow corresponding to the civilization's accent token.

## Shapes
Geometry is strictly codified to align with classic tabletop unit archetypes and mythic talismans:

- **Unit Type Archetypes:**
  - **Mortal:** Pure geometric Circle (`50%` radius border).
  - **Mítico (Mythic):** Pure Diamond (`rotate(45deg)` rounded rhombus with centered upright glyph).
  - **Héroe (Hero):** 8-Pointed Star or Chiseled Hex-Shield polygon container.
- **Interactive Containers:**
  - Buttons, tiles, and modal sheets use a deliberate `12px` border radius (`roundedness: 2`), ensuring a sturdy, carved slab profile rather than hyper-modern pill shapes.
  - Center conflict trigger utilizes an imposing `16px` to `20px` radius with stepped framing.

## Components

### 1. Master Battle Trigger (Center Strip)
- **Geometry:** Height 88px minimum, full-width with 16px lateral padding.
- **Styling:** Finished in `#C9A24B` metallic-fill or deep `#332B25` framed by an ornate 2px `#C9A24B` filigree stroke.
- **Typography:** Noto Serif Bold, 20px, uppercase with `0.08em` tracking ("RESOLVER COMBATE").
- **Haptics & State:** High-contrast glow under active calculation; state switches to split readout showing differential outcome (+/- score).

### 2. Standard Interactive Action Buttons
- **Geometry:** Height minimum 56px, corner radius 12px.
- **Default State:** Background `#26211C`, 1px stroke of `rgba(201, 162, 75, 0.2)`, text `#F3EBDD`.
- **Active / Pressed State:** Background `#332B25`, stroke `#C9A24B`, box-shadow `0 0 12px rgba(201, 162, 75, 0.3)`.

### 3. Unit Selector Chips (Tactile Crests)
- **Geometry:** 56px x 56px minimum touch footprint.
- **Variants:**
  - Mortal: Circular ring with unit count badge pinned top-right.
  - Mítico: Diamond contour framed in faction hue with mythic icon centered.
  - Héroe: Star/Shield contour with elevated gold crest.
- **Selection State:** Active chips shift background from `#1E1A16` to civilization accent container (`#C9A24B22`, `#4FAE5A22`, or `#3FB6D922`) with solid 1.5px accent stroke.

### 4. Stepper Counters & Dice Trays
- **Geometry:** Two 56px square flanking step buttons (`-` and `+`) sandwiching an engraved numeric well.
- **Well Styling:** Background `#14110E`, inset shadow `inset 0 2px 5px rgba(0,0,0,0.8)`, hairline border `rgba(201, 162, 75, 0.15)`.
- **Value Typo:** Noto Serif `numeral-counter` (36px, `#F3EBDD`).

### 5. Opposing Score Totals (Gigantic Readouts)
- **Placement:** Positioned centrally in each mirrored player half.
- **Typo:** `display-titan-mobile` (72px, bold, Noto Serif).
- **Faction Color Coding:** Numbers radiate subtle drop-shadows matching active faction color (e.g. `0 0 24px rgba(63, 182, 217, 0.25)` for Nórdicos).