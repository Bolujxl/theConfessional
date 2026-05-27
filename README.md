# The Confessional

> *say it here. no one will know.*

An anonymous, ephemeral confession board. No accounts. No persistence. Just a dark room, a text box, and the words people need to leave behind.

Confessions fade away after 30 seconds — read them while they last.

---

## How It Works

1. Type your confession into the text box.
2. Hit **Enter** (or click the submit link).
3. Your words appear in the feed and begin to fade.
4. After 30 seconds, they're gone.

Every confession is anonymous. The app stores nothing on disk, sends nothing to a server — your browser holds everything in memory, and closing the tab wipes it clean.

---

## Architecture

```
src/
├── App.tsx                       # Root component, form + feed orchestration
├── main.tsx                      # React entry point
├── index.css                     # Tailwind directives, scrollbar, global resets
├── types.ts                      # Shared TypeScript interfaces
├── components/
│   ├── ConfessionCard.tsx        # Memoized card: text, timestamp, animation
│   └── LightRays.tsx             # WebGL background (ogl-powered ray shader)
├── hooks/
│   ├── useRelativeTime.ts        # Ticks every 60s for "X mins ago" labels
│   └── useEphemeral.ts           # Drives the 30-second opacity fade-to-gone
├── lib/
│   ├── formatTimestamp.ts        # "3 mins ago" / "2 hrs ago" formatter
│   └── stripHtml.ts              # XSS sanitization via DOMParser
└── docs/                         # Engineering documentation
    ├── 01-explanation.md         # ELI7 walkthrough of every concept
    ├── 02-principles.md          # Software engineering principles audit
    ├── 03-audit.md               # Security, a11y, and performance audit
    └── 06-lie-detector.md        # Adversarial architecture verification
```

### Key Design Decisions

| Concern | Approach |
|---------|----------|
| **Anonymity** | No auth, no users, no database — in-memory state only |
| **Impermanence** | `useEphemeral` hook computes a linear opacity fade over 30s; `opacity === 0` removes the card from the DOM |
| **XSS safety** | `stripHtml()` sanitizes user input via `DOMParser` before storage; JSX auto-escapes on render |
| **Accessibility** | Screen-reader-only `<label>`, `aria-live="polite"` on the feed, `useReducedMotion` hook, WCAG AA color contrast |
| **Performance** | `React.memo` on `ConfessionCard` prevents re-render of unchanged items; `useRelativeTime` limits timestamp recalculations to once per minute |
| **Typography** | Playfair Display (serif) for confessions, system-ui for controls — one feels like a diary, the other like a tool |
| **Background** | Subtle WebGL light rays via `ogl`, dark grey `#2a2a2a` on `#0A0A0A`, non-interactive, slow-moving |

---

## Stack

| Layer | Technology |
|-------|------------|
| Build | Vite 5 + React plugin |
| Framework | React 18 (TypeScript) |
| Styling | Tailwind CSS 3 |
| Animation | Framer Motion |
| WebGL | ogl (light rays background) |
| Utilities | clsx + tailwind-merge |

---

## Getting Started

```bash
npm install
npm run dev        # starts dev server at localhost:5173
```

```bash
npm run build      # TypeScript check + production build
npm run preview    # serve the production build locally
npm run lint       # ESLint with zero-warnings policy
```

---

## Character Limit

Confessions are capped at **280 characters** — roughly two to three sentences. The counter appears amber at 241 and red at 280.

---

## Ephemeral Fade

Each confession lives for exactly 30 seconds from the moment it's submitted. A linear opacity transition brings it from fully visible to gone. Cards with `opacity === 0` are filtered from the feed entirely — they don't just become invisible, they stop rendering.

---
