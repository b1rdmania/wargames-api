## WARGAMES Site Brand Guidelines (v2 dashboard source of truth)

### Goals
- **Coherence**: every page should feel like the same product.
- **Judge-proof**: pages should be readable fast, with consistent nav + clear CTAs.
- **Terminal aesthetic**: “intelligence console” vibe, but modern and legible.

### Source of truth
- **Visual base**: `GET /dashboard/v2`
- **Shared tokens + components**: `GET /assets/brand.css` (served from `src/brand.ts`)

### Design tokens (CSS variables)
Use these variables on all pages (already defined in `brand.css`):
- **Surfaces**: `--wg-bg`, `--wg-surface`, `--wg-panel`, `--wg-border`
- **Accents**: `--wg-telemetry` (primary), `--wg-signal` (success), `--wg-warning`, `--wg-fault`, `--wg-intel`
- **Text**: `--wg-text`, `--wg-text-muted`

### Typography
- **Font**: JetBrains Mono everywhere (imported in `brand.css`)
- **Headings**:
  - Primary page title: `.wg-title` (telemetry accent)
  - Subtitle: `.wg-subtitle` (muted, uppercase, letterspaced)
- **Body**: 12–14px equivalent, high line-height, avoid pure-green body text.

### Layout + spacing
- **Max width**: 1600px (`.wg-container`)
- **Padding**: 18–20px page padding, 14–18px inside panels
- Prefer **grid layouts** and avoid centered “marketing hero” unless it’s the pitch.

### Navigation (required on all HTML pages)
Use the same topbar pattern:
- Wrapper: `.wg-topbar` → `.wg-topbar-inner`
- Left: status badge + title + subtitle
- Right: `.wg-nav` links

Recommended nav set:
- Dashboard (`/dashboard/v2`)
- Analytics (`/dashboard/analytics`)
- Predictions (`/dashboard/predictions`)
- Proof (`/integrations/proof`)
- Oracle (`/oracle/agents`)
- Pitch (`/pitch`)
- API (`/`)

### Components
- **Panels/cards**: `.wg-panel`
- **Tables**: `.wg-table`
- **Code**: `.wg-code`
- **Badges**: `.wg-badge` + `.wg-dot`

### Interaction + accessibility
- **Hover states**: always visible (border + subtle glow), no “invisible links”.
- **Contrast**: body text uses `--wg-text`, not neon accents.
- **Motion**: keep subtle (pulse dot ok), avoid rapid animations.

### Coherence audit checklist (quick)
- **Type**: does it use JetBrains Mono + the same heading hierarchy?
- **Color**: is telemetry blue the primary accent (not neon green)?
- **Nav**: does it have the universal topbar with the full nav set?
- **Spacing**: are paddings consistent (no cramped / wildly large gaps)?
- **CTAs**: do important pages include an obvious “what to click next” link?

