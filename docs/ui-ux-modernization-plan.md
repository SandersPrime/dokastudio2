## UI/UX Modernization Plan

### Goals & Scope
- Deliver a cohesive, modern visual language across the quiz ecosystem (index, constructor, host, play, homework, do-homework, catalog, marketplace, earnings, equipment, admin views).
- Preserve all backend/business logic while refreshing UI, interactions, and responsiveness.
- Ensure all screens meet accessibility (WCAG 2.1 AA) and responsive guidelines.
- Provide a reusable design system (tokens + primitives) to replace ad-hoc inline styles.

### Constraints & Guardrails
- No tech-stack changes: remain on Node.js, Express, Prisma, Socket.IO, vanilla JS/HTML/CSS.
- Maintain existing data flows, Socket events, and feature parity—purely presentation/UI upgrades.
- Avoid regressions in touch/keyboard flows; preserve current DOM hooks used by JS controllers.
- Keep CSS modular (shared ui-kit + page bundles) to prevent unused cascade on performance-critical screens.

### Unified Design System
1. **Foundation Tokens**
   - Color roles: `--surface-*` (background layers), `--brand-*`, `--status-*`, neutrals, gradients.
   - Typography scale: fluid clamp values for `display`, `headline`, `title`, `body`, `caption` with `font-weight` map.
   - Spacing scale: `--space-1` (4px) up to `--space-8` (48px) and responsive gap utilities.
   - Elevation: consistent `--shadow-1..4` for cards, overlays, and interactive focus.
   - Motion: `--ease-standard`, `--ease-emphasized`, durations for entrance/exit/micro interactions.

2. **Layout Primitives**
   - `.app-shell`, `.page-grid`, `.panel-grid`, `.split-pane`, `.content-stack` utilities to replace inline grid definitions.
   - Responsive breakpoints: desktop ≥1280, tablet 768–1279, mobile <768 with CSS container queries where needed.
   - Utility classes for max-width containers, auto columns, sticky regions.

3. **Component Library**
   - **Surfaces**: `.card`, `.card-glass`, `.panel`, `.stat-tile`, `.empty-state` refinements (compact, spacious variants).
   - **Navigation**: unified topbar + sidebar modules (author/admin dashboards) with active states and icons.
   - **Forms**: `.form-field`, `.input`, `.select`, `.chip-input`, `.control-group`, inline validation states.
   - **Buttons**: semantic variants (primary, secondary, subtle, destructive, ghost, icon-only) with disabled + loading states.
   - **Status & Feedback**: `.badge`, `.pill`, `.status-toast`, `.toast-stack`, `.progress-ring`, `.timer` module.
   - **List & Cards**: quiz cards, marketplace listings, leaderboard rows, homework assignments consolidated with flexible grid templates.
   - **Overlays**: modal, drawer, sheet patterns with focus trapping + animations.

### Accessibility & Responsiveness
- Minimum 4.5:1 color contrast for text, larger touch targets (44px), focus-visible outlines.
- Keyboard navigation parity on modals, lists, host controls.
- Prefers-reduced-motion adjustments for timers/animations.
- Responsive typography and grids tested on 320px+ widths; ensure host/constructor panels reflow into vertical stacks.

### Page Modernization Strategy
1. **Priority Screens**
   - **Constructor**: move sidebar and editor into `.app-shell` layout; standardize question list items, modals, advanced settings accordions; integrate drag states + media upload dropzones using shared components.
   - **Host**: replace inline styles with `panel-grid` + `.status-pill`; add state banner, improved leaderboards, timer with progress ring, adaptive action bar for tablet/mobile.
   - **Play**: unify player journey screens with progressive disclosure, improved feedback cards, CTA placement, and haptic-ready button states.
   - **Homework & Do-homework**: redesign assignment lists, due-date badges, and submission flow with responsive tables/cards.

2. **Dashboard & Commerce**
   - **Catalog/Marketplace**: adopt section headers, filter chips, masonry cards, price tags, CTA hierarchy.
   - **Earnings & Equipment**: structured stats tiles, timeline rows, approval tables with status pills and batch actions.
   - **Admin Pages**: consistent admin shell, modals for approvals, improved empty/loaded states.

3. **Shared Landing (index)**
   - Hero with gradient background, feature grid, testimonial or KPI strips, and clear CTAs linking to constructor/host flows.

### Implementation Phasing
1. **Foundation**
   - Create `/public/css/ui-kit.css` for tokens, layout, utilities, component primitives.
   - Ensure `style.css` imports `ui-kit.css` first or consolidates tokens there.
   - Introduce optional `/public/css/dashboard.css` for shell/nav patterns used by multiple admin pages.

2. **Page Refactors**
   - Remove inline `<style>` blocks; replace with semantic classes defined in new CSS files.
   - Incrementally update HTML structure where necessary (wrappers, aria attributes) without disturbing data hooks (`id`, `data-*`).
   - Update JS selectors if new class names are introduced for dynamic states (document in migration notes).

3. **QA Checklist**
   - Visual regression spot-check on desktop/tablet/mobile breakpoints per page.
   - Keyboard-only walkthrough for modals, host controls, and constructor forms.
   - Socket-driven flows (host ↔ play) to confirm DOM updates remain intact.

### Deliverables
- `public/css/ui-kit.css` (new) — tokens, utilities, component primitives.
- Updated `public/css/style.css` — slimmed base, references to new scales.
- Optional `public/css/dashboard.css` — shared dashboard shell.
- Refactored HTML/JS per page (as enumerated in task list) using new classes.
- Documentation: changelog + migration notes appended to `docs/ui-ux-modernization-plan.md` or `README`.

### Success Metrics
- No regressions in existing features or Socket flows.
- Consistent look across all key pages with shared components.
- Improved lighthouse accessibility & best-practices scores (target 90+).
- Responsive layouts verified at 320px, 768px, 1024px, 1440px.

### Implemented Audit Notes

#### Constructor
- Weak spots: two-column layout hid advanced settings inside a long editor flow, selected question state was visually weak, and editor content could remain hidden after selecting a question.
- Changes: upgraded to a three-zone workspace: question list, central editor, right settings panel. Added sticky action bar, save status, active question/type styling, clearer empty state, and preserved all existing `id` hooks used by services.

#### Host
- Weak spots: lobby, PIN, question controls, and leaderboard competed for attention.
- Changes: added host page header, stronger PIN treatment, consistent player/leaderboard rows, clearer quiz launch panel, and shared status/timer/answer card styles.

#### Play
- Weak spots: mobile flow needed stronger tap targets and clearer state rhythm.
- Changes: added mobile-first join copy, full-width CTA, consistent score pill, answer buttons, timer styling, lobby/pause state hierarchy, and larger readable touch targets.

#### Homework / Do-homework
- Weak spots: teacher creation/reporting and student join flow looked like raw forms.
- Changes: added teacher dashboard framing, task creation guidance, shared summary cards, student preview/join hierarchy, progress styling, and answer option states.

#### Catalog / Marketplace / Author / Earnings
- Weak spots: filters and commerce cards felt disconnected and price/action hierarchy was flat.
- Changes: standardized page headers, filter bars, catalog/market cards, price rows, action buttons, payout/sales cards, empty states, and table-like rows.

#### Equipment / Admin
- Weak spots: equipment pages used a separate visual language and admin flows lacked common dashboard treatment.
- Changes: unified DokaLab pages into the product system while preserving their content structure, request forms, product cards, admin product grid, request status filter, marketplace moderation, and payout workflows.

### Implementation Notes
- Added `/public/css/ui-modernization.css` as the progressive SaaS design layer loaded after existing page styles.
- Kept `/public/css/ui-kit.css` as foundation and imported it from `style.css` for shared variables and primitives.
- Preserved backend routes, Socket.IO events, form field `id`s, and existing JS function names.
- Avoided stack changes and kept implementation in vanilla HTML/CSS/JS.
