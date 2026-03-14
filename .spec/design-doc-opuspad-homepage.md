# OpusPad Homepage Redesign — System Design Doc

## Overview

Redesign the marketing homepage at `docs/index.html` for OpusPad, a local-first Chrome extension that lets developers review and edit AI-generated Markdown files directly in the browser. The target audience is AI coding power users (Claude Code, Cursor, etc.) who constantly open and edit Markdown specs, plans, and notes. The page is a single static HTML file hosted on GitHub Pages. No build step, no framework — pure HTML/CSS/JS with Google Fonts.

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| HTML5 | — | Semantic markup, single-file page |
| CSS3 | — | All styling inline in `<style>` tag, CSS custom properties |
| Google Fonts (Outfit) | — | Typography: headings, body, accents |
| Vanilla JS | — | Scroll animations (IntersectionObserver), mobile nav toggle |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| GitHub Pages | Hosting via `docs/` directory on `main` branch |

### External Services
N/A — No analytics, no tracking, no backend.

### Dev Dependencies
N/A — No build tools needed. The file is hand-written HTML.

## Data Model

N/A — This is a static marketing page with no data persistence.

## API Contracts

N/A — No API endpoints.

## Core User Flows

### Flow 1: Visitor lands on homepage and installs extension

| Step | User Action | System Behavior |
|------|------------|-----------------|
| 1 | Opens `https://editor.dull.business` | GitHub Pages serves `docs/index.html` |
| 2 | Reads hero section | Sees headline, subheadline, and CTA button |
| 3 | Scrolls down | Feature grid, "Why it matters" sections, comparison table, FAQ appear with subtle fade-in animations |
| 4 | Clicks "Add to Chrome — It's Free" | Navigates to Chrome Web Store listing |
| 5 | (Alt) Clicks "View on GitHub" | Opens GitHub repo in new tab |
| 6 | (Alt) Clicks "Privacy Policy" in footer | Navigates to `privacy/` subpage |

## Page Structure & Copy

### Section 1: Navigation Bar
Fixed top nav with frosted glass (backdrop-filter: blur). Contains:
- **Left**: OpusPad logo (icon128.png) + "OpusPad" text
- **Right**: Links — "Features" (anchor), "Source" (GitHub), "Privacy" (privacy/)
- Mobile: hamburger menu toggle

### Section 2: Hero
- **Badge**: `Chrome Extension — Free & Open Source`
- **Headline**: `Review and edit AI-generated Markdown without leaving your browser.`
- **Subheadline**: `Built for developers. No sign-ups, no uploads, no bloated features. Open, review, and edit your Markdown files instantly—WYSIWYG or source mode. The fastest way to refine AI agent output.`
- **CTA buttons**:
  - Primary: `Add to Chrome — It's Free` → links to CWS listing
  - Secondary: `View on GitHub` → links to repo
- **Hero image**: Product screenshot (`preview.jpg`) with border/shadow treatment

### Section 3: Feature Grid (9 cards, 3×3 grid)
Title: `Everything you need. Nothing you don't.`
Subtitle: `OpusPad does one thing well: make your local Markdown files fast to open, easy to read, and simple to edit.`

Feature cards (each has emoji icon, title, description):

1. **📂 Local File Access**
   `Open any folder from your disk. Read and write directly using Chrome's native File System API. No cloud, no middleman.`

2. **✍️ WYSIWYG Editing**
   `A clean block editor for natural reading and editing. Tables, code blocks, and lists render beautifully — not as raw tags.`

3. **💻 Source Mode**
   `Drop down to raw Markdown when syntax gets complex. Full CodeMirror editor with syntax highlighting.`

4. **🔄 Auto Save**
   `Your edits are saved to disk automatically. No manual Ctrl+S required — just type and it persists.`

5. **📡 External Change Detection**
   `When an AI agent updates a file on disk, OpusPad detects the change and reloads automatically. Stay in sync without switching windows.`

6. **📁 Directory Sidebar**
   `Browse your project's file tree with a collapsible sidebar. Smart fuzzy search lets you jump to any file instantly.`

7. **➕ File Management**
   `Create new Markdown files and delete old ones directly from the sidebar. No need to open a terminal.`

8. **🔒 100% Private**
   `Zero telemetry. Zero uploads. Zero data collection. Your code specs never leave your machine.`

9. **⚡ Lightweight**
   `No Electron overhead. Runs natively inside Chrome. Opens instantly. Closes cleanly. Stays out of your way.`

### Section 4: "Why It Matters" — 3-panel section
Dark background (`#0f172a`), white text. Three panels stacked vertically with alternating text+illustration layout.

**Panel 1: Built for Agent Workflows**
> AI coding agents generate a massive amount of Markdown — architecture plans, `CLAUDE.md` rulesets, implementation notes. OpusPad gives you an instant, readable interface to review and refine these documents without breaking your flow.

**Panel 2: The Missing Middle Ground**
> TextEdit shows you raw tags. VS Code is overkill for a quick review. Cloud editors require an upload. OpusPad sits in the sweet spot: browser-native, local-first, and purpose-built for reading Markdown the way it was meant to be seen.

**Panel 3: Written Communication with AI**
> The best AI workflows are conversational — you write specs, the agent implements, you review the output, and iterate. OpusPad makes that review/edit step frictionless. Open a file, refine the text, save. Back to your agent in seconds.

### Section 5: Comparison Table
Title: `How OpusPad compares`

| Feature | OpusPad | Raw Browser | VS Code / Obsidian | Cloud Docs |
|---------|---------|-------------|-------------------|------------|
| Opens instantly in Chrome | ✅ | ✅ | ❌ Separate app | ❌ Requires upload |
| Renders Markdown beautifully | ✅ | ❌ Raw tags | ✅ | ✅ |
| Edits save to local disk | ✅ | ❌ | ✅ | ❌ Cloud only |
| Zero setup / install | ✅ Chrome extension | ✅ | ❌ App + plugins | ✅ |
| No cloud upload required | ✅ | ✅ | ✅ | ❌ |
| Source mode for complex Markdown | ✅ | ❌ | ✅ | ❌ |
| Auto-reloads on external changes | ✅ | ❌ | ✅ | N/A |
| Lightweight (no Electron) | ✅ | ✅ | ❌ Electron | ✅ |

### Section 6: FAQ
Title: `Questions`

**Q: Does OpusPad upload my files anywhere?**
A: Never. OpusPad is strictly local-first. It reads and writes directly to your local drive using Chrome's File System Access API. There is no server, no cloud sync, and no telemetry.

**Q: Is this a note-taking app?**
A: No. We don't do wikis, backlinks, or graph views. OpusPad does one thing well: it makes local Markdown files fast to open, easy to read, and simple to edit.

**Q: Does it handle complex Markdown from Claude or Cursor?**
A: Yes. OpusPad handles tables, nested lists, code blocks, and more. If something is too complex for the WYSIWYG editor, the compatibility guard automatically falls back to source mode so nothing gets mangled.

**Q: Can I use it alongside other editors?**
A: Absolutely. When an external tool (or AI agent) modifies a file on disk, OpusPad detects the change and reloads the latest version automatically.

**Q: Is it free?**
A: Yes. OpusPad is free and open source.

### Section 7: Closing CTA
Dark background section:
- Headline: `Stop squinting at raw Markdown.`
- Subheadline: `Get the lightweight, local-first editor built for reviewing AI agent outputs.`
- CTA button: `Add to Chrome — It's Free`

### Section 8: Footer
- Left: `© 2026 OpusPad. All rights reserved.`
- Right links: Privacy Policy, GitHub

## Visual Direction

### Colors (CSS custom properties)
```css
:root {
    --bg: #ffffff;
    --surface: #f8fafc;
    --text-primary: #0f172a;
    --text-secondary: #64748b;
    --accent: #2563eb;
    --accent-soft: #eff6ff;
    --border: #e2e8f0;
    --dark-bg: #0f172a;
    --dark-surface: #1e293b;
    --dark-text: #f8fafc;
    --dark-muted: #94a3b8;
    --radius: 12px;
    --font: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
```

### Typography
- Font family: Outfit (Google Fonts), already loaded in the current page
- h1: `clamp(2.5rem, 5vw, 3.5rem)`, weight 700, tight letter-spacing (-0.02em)
- h2: `2rem`, weight 700
- h3: `1.25rem`, weight 600
- Body: `1rem`, line-height 1.6
- Subtitle: `1.15rem`, color `--text-secondary`

### Layout
- Max content width: `1100px`
- Generous padding: `5%` horizontal
- Section spacing: `100px` between major sections
- Card grid: `repeat(auto-fit, minmax(300px, 1fr))`

### Animations
- Hero: fade-in on load (`opacity 0→1`, `translateY 20px→0`, 0.8s ease-out)
- Feature cards and sections: fade-in on scroll using `IntersectionObserver`
- Cards: `translateY(-4px)` + subtle shadow on hover
- CTA button: `translateY(-2px)` + deeper shadow on hover

### Design Feel
- Clean, modern, developer-focused
- White background with slate accents
- Dark sections for contrast (comparison, "why it matters", closing CTA)
- No illustrations, mascots, or decorative elements — let typography and whitespace speak
- Icons: Emoji in feature cards (already established in current design)

## Implementation Plan

### Task 1: Rewrite `docs/index.html` with new page structure and content
**Dependencies:** None

**Pre-conditions (verify before starting):**
- `ls docs/index.html` → expect: file exists
- `ls docs/icon128.png` → expect: file exists
- `ls docs/preview.jpg` → expect: file exists

**Environment bootstrap:**
- No build tools needed. Edit `docs/index.html` directly.
- To preview: open `docs/index.html` in a browser, or use `npx serve docs/`

**Scope:** Rewrite the entire `docs/index.html` file. Replace the current hero, feature grid, and "Built for the AI Age" section with the full page structure defined above (nav, hero, 9-feature grid, 3 "why it matters" panels, comparison table, FAQ, closing CTA, footer). All styles remain inline in a `<style>` tag. Add a small `<script>` for scroll-triggered fade-in animations using `IntersectionObserver`. The file must remain a single self-contained HTML file with no external dependencies beyond Google Fonts.

**Files modified:** `docs/index.html`

**Acceptance criteria:**
- [ ] Page renders in Chrome with no console errors
- [ ] Hero section shows exact headline: "Review and edit AI-generated Markdown without leaving your browser."
- [ ] Hero section shows refined subheadline text
- [ ] CTA button text is "Add to Chrome — It's Free" and links to `https://chromewebstore.google.com/detail/opuspad/ephlhjlnpnjjnjgdohdnbknadhklcoag`
- [ ] Feature grid has exactly 9 cards with the titles: Local File Access, WYSIWYG Editing, Source Mode, Auto Save, External Change Detection, Directory Sidebar, File Management, 100% Private, Lightweight
- [ ] Feature grid descriptions match the copy defined in the "Page Structure & Copy" section above
- [ ] "Why It Matters" section has 3 panels with dark background
- [ ] Comparison table renders with 8 feature rows and 4 columns (OpusPad, Raw Browser, VS Code/Obsidian, Cloud Docs)
- [ ] FAQ section has 5 Q&A pairs
- [ ] Closing CTA section has dark background with "Stop squinting at raw Markdown." headline
- [ ] Footer includes © 2026, Privacy Policy link (to `privacy/`), and GitHub link
- [ ] Scroll-triggered fade-in animations work on feature cards and sections
- [ ] Page is responsive: feature grid collapses to 1 column on mobile (<768px), CTA group stacks vertically
- [ ] Nav links (#features anchor, GitHub, Privacy) all work correctly
- [ ] `meta description` tag is present and updated
- [ ] `title` tag is present and meaningful
- [ ] Hero image (`preview.jpg`) renders with border/shadow treatment
- [ ] CSS custom properties match the Visual Direction section

**Verification (run after completion):**
- Browser: open `docs/index.html` — page renders, no errors in console
- Browser: scroll through all sections — fade-in animations trigger
- Browser: click "Add to Chrome" CTA → navigates to Chrome Web Store listing
- Browser: click "View on GitHub" → opens GitHub repo
- Browser: resize to 375px width → layout is single-column, no horizontal overflow
- `grep -c "feature-card" docs/index.html` → expect: at least 9 (9 card divs)
- `grep "Review and edit AI-generated" docs/index.html` → expect: match found

**Out of scope:** Does not update `preview.jpg` or `icon128.png`. Does not create new images. Does not change the privacy page. Does not add any external JS libraries.

### Task 2: Update the hero screenshot image
**Dependencies:** Task 1

**Pre-conditions (verify before starting):**
- Task 1 is complete — `docs/index.html` has been rewritten
- Extension is buildable: `npm run build` succeeds

**Scope:** Generate a new hero screenshot (`docs/preview.jpg`) by capturing the OpusPad extension UI with a representative Markdown file open (e.g., a `CLAUDE.md` or `README.md` with headings, lists, and code blocks). Use Playwright or manual screenshot. The screenshot should show the sidebar + WYSIWYG editor in a realistic, polished state. Save as `docs/preview.jpg`.

**Files modified:** `docs/preview.jpg`

**Acceptance criteria:**
- [ ] `docs/preview.jpg` exists and is a valid JPEG
- [ ] Image shows the OpusPad UI with: sidebar visible, a Markdown file open in WYSIWYG mode
- [ ] Image dimensions are at least 1200px wide for sharp rendering on retina
- [ ] File size is under 500KB (JPEG compression)

**Verification (run after completion):**
- `file docs/preview.jpg` → expect: JPEG image data
- Browser: open `docs/index.html` → hero image renders without distortion
- `identify docs/preview.jpg` or `file docs/preview.jpg` → width >= 1200

⚠️ HUMAN: If the extension cannot be run in a headless browser context (Chrome extension limitations), manually capture a screenshot of the running extension.

**Out of scope:** This task does not modify `index.html` itself.

## Verification Plan

### Setup
```bash
cd docs/
npx serve .
# Or simply open docs/index.html in Chrome
```

### Happy Path
1. Browser: open `http://localhost:3000` (or file://...docs/index.html) → page loads, hero visible
2. Browser: scroll → feature cards fade in
3. Browser: observe comparison table → all checkmarks/crosses render
4. Browser: click "Add to Chrome" → navigates to CWS
5. Browser: click "Privacy Policy" → navigates to `privacy/` page
6. Browser: resize to 375px → single-column layout, no overflow

### Content Verification
1. `grep "Review and edit AI-generated Markdown" docs/index.html` → match
2. `grep "Add to Chrome" docs/index.html` → match found in at least 2 places (hero + closing)
3. `grep "feature-card" docs/index.html` → at least 9 matches
4. `grep "100% Private" docs/index.html` → match
5. `grep "Why It Matters\|Built for Agent Workflows\|Missing Middle Ground\|Written Communication" docs/index.html` → 3+ matches

## Open Questions

None — all decisions resolved. Agents may proceed on all tasks.
