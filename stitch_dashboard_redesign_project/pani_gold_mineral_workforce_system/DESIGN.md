---
name: Pani Gold Mineral & Workforce System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4059aa'
  on-secondary: '#ffffff'
  secondary-container: '#8fa7fe'
  on-secondary-container: '#1d3989'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b6c4ff'
  on-secondary-fixed: '#00164e'
  on-secondary-fixed-variant: '#264191'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: IBM Plex Sans
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-precision, institutional operating environment tailored for heavy-industry human capital management, occupational health, safety compliance, and site-level mineral operational monitoring. The design aesthetic balances executive authority with operational rigor—combining the clarity of industrial instrumentation with modern enterprise elegance.

### Design Principles
- **Operational Precision**: Every screen prioritizes high-density data legibility, structured taxonomies, and clear state visibility over decorative flourishes.
- **Architectural Hierarchy**: Information is structured in disciplined planar tiers, preventing cognitive fatigue for mining site supervisors, HR officers, and executive stakeholders.
- **High-Stakes Status Clarity**: System states, certifications, and compliance indicators leverage high-contrast semantic indicators that remove ambiguity across shifts and operational environments.

## Colors

The system uses a commanding, architectural color palette designed for high legibility, strict contrast standards (WCAG AAA for text), and immediate operational recognition.

### Palette Roles
- **Base Canvas & Shell**: Backgrounds leverage a crisp cool-slate base (`#f8fafc`), with pure white (`#ffffff`) reserved for surface cards, modal layers, and interactive panels. A structured neutral slate spectrum (`#e2e8f0` for borders, `#64748b` for secondary labels, `#334155` for body copy) creates grounded contrast.
- **Primary Authority**: Deep slate black (`#0f172a`) anchors headers, primary text, navigation sidebars, and critical action triggers. Deep navy blue (`#1e3a8a`) acts as the supporting operational primary, driving primary interactive selections, focused borders, and executive-level accents.
- **Functional & Compliance Accents**:
  - **Compliance & Certified Safe**: Emerald Green (`#059669`) signals active workforce licenses, verified permits, compliant HSE milestones, and positive site metrics.
  - **Caution & Action Required**: Warning Amber (`#d97706`) indicates expiring site certifications, safety training warnings, and operational throttles.
  - **Critical & Non-Compliance**: Danger Red (`#dc2626`) indicates safety violations, site access restrictions, incidents, and mandatory operational shutdowns.

## Typography

Typography pairs institutional clarity with technical precision. 

- **Primary Interface (IBM Plex Sans)**: Used for all primary headlines, interface controls, prose, and table contents. Its humanist-grotesque hybrid nature conveys industrial authority, superior legibility at low sizes, and structured stability.
- **Data & Metric Verification (JetBrains Mono)**: Applied selectively for all numerical telemetry, mining pit coordinates, personnel badge IDs, safety audit codes, timestamps, and compact metric badges. The monospaced cadence standardizes visual widths across live data feeds and complex multi-column tables.

## Layout & Spacing

The layout is engineered around a 12-column fluid-grid architecture bound within a responsive viewport, with an optimal desktop canvas maximum width of `1600px`. 

### Breakpoint Structure
- **Desktop (`>= 1280px`)**: Full 12-column view with fixed 260px operational side navigation. Gutter width is fixed at `1.5rem` (`24px`), with outer canvas margins of `2rem` (`32px`).
- **Tablet / Rugged Terminal (`768px - 1279px`)**: 8-column layout. Navigation collapses into an icon rail (64px width). Gutters compress to `1rem` (`16px`), canvas margins to `1.5rem` (`24px`).
- **Mobile (`< 768px`)**: 4-column layout with stacked metric grids. Outer margins reduce to `1rem` (`16px`), gutters to `0.75rem` (`12px`). Data grids switch to horizontal card-scroll or key-value list formats.

### Spacing Philosophy
Spacing strictly adheres to an 8px vertical baseline (with 4px substeps). Component internals maintain dense margins (`space-xs` and `space-sm`) to maximize visible information density without compromising touch targets on field tablets.

## Elevation & Depth

Visual hierarchy uses a refined combination of **low-contrast structural outlines** and **subtle ambient shadows**, intentionally avoiding excessive blur or skeuomorphic styling.

### Structural Depth Layers
- **Level 0 (Canvas Base)**: The base application plane (`#f8fafc`).
- **Level 1 (Surface Containers & Tables)**: Background `#ffffff`, delineated by a crisp 1px perimeter border (`#e2e8f0`). No drop shadows are used on standard cards, creating a disciplined, planar presentation.
- **Level 2 (Interactive Floating & Flyouts)**: Dropdowns, filter menus, and action drawers. Bordered with `#cbd5e1` and elevated by a directional shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Modal Dialogs & Critical Alerts)**: Shift logs, emergency sign-offs, and detail panels. Elevated via `0 16px 32px -4px rgba(15, 23, 42, 0.14)` over a 50% opacity backdrop blur overlay (`rgba(15, 23, 42, 0.5)`).

## Shapes

The design system enforces a **Soft (`1`)** shape language. Interface geometry uses measured, disciplined curves that reinforce technical precision rather than playful softness.

- **Base Radius (0.25rem / 4px)**: Primary form inputs, status chips, standard buttons, table cell indicators, and tab bars.
- **Medium Radius (0.5rem / 8px)**: Surface panels, metric KPI containers, modals, and data tables.
- **No Circular Elements**: Avatars and icon containers maintain a 4px soft-square profile to preserve the portal's uniform architectural language.

## Components

### Buttons
- **Primary Action**: Solid `#0f172a` with `#ffffff` text; on hover transitions to `#1e3a8a`. 4px border-radius, `space-sm` vertical by `space-md` horizontal padding. Font: IBM Plex Sans Medium.
- **Compliance Trigger**: Solid `#059669` with `#ffffff` text for sign-offs and safety verifications.
- **Secondary / Outline**: `#ffffff` background with 1px solid `#cbd5e1` border and `#1e3a8a` typography.
- **Destructive**: `#ffffff` background with 1px solid `#dc2626` border and `#dc2626` text; on hover shifts to solid `#dc2626` with `#ffffff` text.

### High-Contrast Metrics (KPI Blocks)
- **Container**: Elevated `#ffffff` card with 1px solid `#e2e8f0` border, `space-md` padding.
- **Metric Label**: Uppercase `label-md` (JetBrains Mono) in `#64748b`.
- **Numerical Value**: `display-lg` in `#0f172a`, right-aligned delta indicator.
- **Operational Delta Badge**: Pill-like badge utilizing 10% opacity semantic fills (e.g., `#ecfdf5` background with `#059669` text for positive safety hours; `#fef2f2` with `#dc2626` for incident rates).

### Data Tables
- **Header**: `#f1f5f9` background, 1px bottom border `#cbd5e1`. Header titles use `label-md` JetBrains Mono, uppercase, with `#475569` text.
- **Rows**: Fixed 48px standard row height, 1px horizontal dividers (`#f1f5f9`). Alternating hover state in `#f8fafc`.
- **Numeric & Coordinate Alignment**: Strict right-alignment for values, rendered in JetBrains Mono (`body-sm`). Textual columns aligned left in IBM Plex Sans (`body-md`).

### Badges & Status Chips
- **Geometry**: Compact 4px radius, `space-xs` vertical and `space-sm` horizontal padding.
- **Typography**: JetBrains Mono `label-sm`, semi-bold, uppercase.
- **Semantic Mappings**:
  - *Compliant / Active*: Surface `#ecfdf5`, Border `#a7f3d0`, Text `#065f46`.
  - *Warning / Expiring*: Surface `#fffbeb`, Border `#fde68a`, Text `#92400e`.
  - *Incident / Restricted*: Surface `#fef2f2`, Border `#fecaca`, Text `#991b1b`.
  - *Neutral Shift / Off-Duty*: Surface `#f1f5f9`, Border `#e2e8f0`, Text `#475569`.

### Tab Controls
- **Segmented Portal Switcher**: Contained within a `#e2e8f0` background rail with 4px border radius. Active tab is `#ffffff` with a subtle elevation (`0 1px 3px rgba(0,0,0,0.06)`) and `#0f172a` text. Inactive tabs display `#64748b` text.
- **Section Line Tabs**: Bottom-bordered style (`#e2e8f0`). Active tab indicated by an active 2px bottom rule in `#1e3a8a` with medium font weight.

### Input Fields
- **Container**: Solid `#ffffff` background with 1px border `#cbd5e1`, 4px border-radius, standard 40px height.
- **Typography**: IBM Plex Sans `body-md` in `#0f172a`, placeholder text in `#94a3b8`.
- **Focus State**: 1px border `#1e3a8a` accompanied by a distinct 2px outer halo of `#bfdbfe` (`rgba(30, 58, 138, 0.2)`). Error state switches border to `#dc2626` with red halo.