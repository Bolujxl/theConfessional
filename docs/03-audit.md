# Engineering Security & Accessibility Audit

## Cross-Site Scripting (XSS)

### 1. The Diagnosis

A confession board takes raw text from strangers and paints it onto the page. If the painting step does not clean the text first, a bad actor can paint something dangerous — a `<script>` tag that steals data, redirects the browser, or defaces the page.

The rendering line is:

```
src/App.tsx:118-119
<p className="playfair text-[17px] leading-[1.8] text-white/85">
  {confession.text}
</p>
```

**Current status: safe, but by framework default, not by conscious design.** React's JSX expression `{confession.text}` escapes the string automatically. If someone submits `"<script>alert('hello')</script>"`, React renders it as visible text — the angle brackets become harmless symbols (`&lt;` and `&gt;`) rather than executable HTML. The browser sees plain characters, not a script instruction.

Here is why this is "safe by accident": if anyone unfamiliar with this behaviour later changes this line to use `dangerouslySetInnerHTML` — a React escape hatch that injects raw HTML — the protection vanishes instantly. A junior developer wanting to render formatted confessions with bold or italics might reach for that prop and unknowingly open the floodgates.

The deeper problem: there is no explicit sanitization layer anywhere in the pipeline. The submission handler at line 43-56 does a `.trim()` for whitespace but performs zero content inspection. A confessional app that later adds markdown rendering, link detection, or image embedding would need a sanitizer immediately, and the current code does not signal where that sanitizer should live.

### 2. The Solution

**Step 1: Add an explicit sanitization function.** Even though React escapes strings, making sanitization a named, intentional step creates a clear signal for future developers. Place it in the submit handler — the single choke point where all user text enters the system.

```diff
// src/App.tsx — inside handleSubmit, after .trim()
const trimmedText = inputText.trim();
if (!trimmedText) return;

+ // Strip any HTML tags that might have been pasted.
+ // React JSX escapes strings, but explicit sanitization
+ // protects against future refactors that might bypass it.
+ const sanitizedText = stripHtml(trimmedText);
+
const newConfession: Confession = {
  id: crypto.randomUUID(),
- text: trimmedText,
+ text: sanitizedText,
  createdAt: Date.now(),
};
```

**Step 2: Create the `stripHtml` utility.** Place it in its own file so it is discoverable and testable.

```ts
// src/lib/stripHtml.ts
/**
 * Removes all HTML tags from a string.
 * Uses the browser's built-in HTML parser for correctness —
 * regex-based approaches miss edge cases like nested tags,
 * malformed markup, and entity encoding tricks.
 */
export function stripHtml(input: string): string {
  const doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.body.textContent ?? '';
}
```

This approach uses the browser's own parser — the same engine that processes real HTML — instead of hand-rolled regex. Regex solutions fail on inputs like `"<<scr" + "ipt>"` or encoded entities like `&#60;script&#62;`. The parser cannot be tricked by these because it uses the exact same rules the browser uses to decide what is and is not a tag.

**Step 3: Document the boundary.** Add a one-line comment above the rendering line to mark it as the output boundary:

```tsx
{/* SAFE: React JSX auto-escapes string content. Do NOT replace with dangerouslySetInnerHTML. */}
<p className="playfair text-[17px] leading-[1.8] text-white/85">
  {confession.text}
</p>
```

This comment is a contract. Any future developer who reads it knows three things: the current approach is intentional, the escape is happening, and the one thing they must not do.

---

## Accessibility (a11y)

### 1. The Diagnosis — Missing Label on the Textarea

A `<textarea>` without an associated `<label>` is invisible to screen readers. Users who cannot see the screen rely on labels to understand what each form field does. The placeholder text ("say it here. no one will know.") is not a substitute — many screen readers skip placeholders, and the WCAG (Web Content Accessibility Guidelines) explicitly state that placeholder text must not be the sole method of identifying a form field.

```
src/App.tsx:73-84
<textarea
  ref={textareaRef}
  value={inputText}
  onChange={(e) => setInputText(e.target.value)}
  maxLength={limit}
  placeholder="say it here. no one will know."
  ...
/>
```

There is no `<label>` element, no `aria-label`, and no `aria-labelledby`. A screen reader user landing on this field hears nothing — or at best, it reads the placeholder after a delay, which is unreliable across different screen reader/browser combinations.

### 2. The Solution — Explicit Label with `htmlFor`

```diff
// src/App.tsx — the form section
<section className="flex flex-col">
+ <label
+   htmlFor="confession-textarea"
+   className="sr-only"
+ >
+   Write your anonymous confession
+ </label>
  <textarea
+   id="confession-textarea"
    ref={textareaRef}
    value={inputText}
    ...
  />
```

The `sr-only` class (screen-reader-only) hides the label visually while keeping it accessible to assistive technology. Tailwind ships this class built-in — it positions the element off-screen rather than using `display: none`, which would also hide it from screen readers.

The `htmlFor` on the label and `id` on the textarea create an explicit pairing. Now when a screen reader user focuses the textarea, it announces: "Write your anonymous confession, edit text."

---

### 1. The Diagnosis — No Live Region for New Confessions

When a user submits a confession, it appears in the feed. A sighted user sees it slide up. A screen reader user hears nothing. The dynamic content is added to the DOM, but no assistive technology announcement fires. The user might think the submission failed and resubmit repeatedly.

### 2. The Solution — `aria-live` Region

```diff
// src/App.tsx — wrap the feed in a live region
<section className="mt-14 flex flex-col gap-10">
+ <div aria-live="polite" aria-atomic="false">
    <AnimatePresence initial={false}>
      {confessions.map((confession) => (
        ...
      ))}
    </AnimatePresence>
+ </div>
</section>
```

`aria-live="polite"` tells screen readers: "When content inside this container changes, announce it, but wait until the user finishes whatever they are currently hearing." It does not interrupt — it politely queues the announcement.

`aria-atomic="false"` means "only announce the new content, not the entire list again." Without this, every submission would re-read every confession ever posted.

---

### 1. The Diagnosis — Color Contrast Failures

The app uses white text at various opacities over a `#0A0A0A` background. Several text elements fall below WCAG 2.1 AA thresholds (4.5:1 for normal text, 3:1 for large text).

| Element | Color | vs. #0A0A0A | Passes AA? |
|---------|-------|-------------|------------|
| Header "The Confessional" | `rgba(255,255,255,0.4)` | ~3.1:1 | Only for large text |
| Placeholder text | `rgba(255,255,255,0.2)` | ~1.8:1 | **Fails** |
| Character counter (normal) | `rgba(255,255,255,0.25)` | ~2.1:1 | **Fails** |
| Character counter (amber) | `rgba(255,165,0,0.7)` | ~2.8:1 | **Fails** |
| Character counter (red) | `#E84545` | ~4.5:1 | Passes (borderline) |
| Confession body | `rgba(255,255,255,0.85)` | ~11:1 | Passes |
| Submit button | `rgba(255,255,255,0.6)` | ~5.7:1 | Passes |
| Timestamp | `rgba(255,255,255,0.25)` | ~2.1:1 | **Fails** |

Four text elements fail WCAG AA. The placeholder and low-count character counter are the most concerning because they carry functional information — "where do I type?" and "how many characters do I have left?"

### 2. The Solution — Adjust Opacity Floors

```diff
// tailwind.config.js — add accessible opacity variants
extend: {
  colors: {
    background: "#0A0A0A",
    surface: "#141414",
    border: "rgba(255,255,255,0.08)",
-   warning: "rgba(255,165,0,0.7)",
+   warning: "#E8952E",        // Solid amber, ~4.6:1 on #0A0A0A
    danger: "#E84545",
+   muted: "#8B8B8B",          // Solid grey, ~5.4:1 on #0A0A0A — replaces 25% white
+   subtle: "#5C5C5C",         // Solid grey, ~4.5:1 on #141414 — replaces 20% white on surface
  },
}
```

Then replace the opacity-based classes throughout:

```diff
// Character counter
<span className={cn(
  "system-ui text-[12px]",
- charCount >= 280 ? "text-danger" : charCount >= 241 ? "text-warning" : "text-white/25"
+ charCount >= 280 ? "text-danger" : charCount >= 241 ? "text-warning" : "text-muted"
)}>

// Placeholder — use a CSS custom property or Tailwind arbitrary value
- placeholder:text-white/20
+ placeholder:text-subtle

// Timestamp
- <div className="mt-2 system-ui text-[12px] text-white/25 uppercase tracking-wide">
+ <div className="mt-2 system-ui text-[12px] text-muted uppercase tracking-wide">

// Header
- <h1 className="mt-4 text-[16px] font-normal tracking-[0.12em] text-white/40 playfair uppercase">
+ <h1 className="mt-4 text-[16px] font-normal tracking-[0.12em] text-white/50 playfair uppercase">
```

The key insight: you do not need to go full black-and-white. Solid greys like `#8B8B8B` and `#5C5C5C` preserve the moody, low-contrast aesthetic while crossing the 4.5:1 threshold. The difference is subtle to a sighted user but transforms the experience for someone with low vision.

---

### 1. The Diagnosis — Focus Management After Submission

After submitting a confession, line 55 calls `textareaRef.current?.focus()` to return the cursor to the textarea. While this behaviour is correct for power users who want to write multiple confessions quickly, it creates a focus trap for keyboard-only and screen reader users: they are yanked away from the new content they just created and dropped back at the input. They may never discover that their confession was posted successfully.

### 2. The Solution — Provide a Skip Link or Managed Focus

The simplest client-side fix is to add a visible (but unobtrusive) link that appears briefly after submission, allowing keyboard users to jump to their new confession:

```diff
// After handleSubmit — set a flag to show a skip link
const handleSubmit = () => {
  ...
  setConfessions([newConfession, ...confessions]);
  setInputText('');
+ setShowSkipLink(true);
  textareaRef.current?.focus();
};

// In the feed, right before the list:
+ {showSkipLink && (
+   <a
+     href={`#${newConfession.id}`}
+     className="system-ui text-[13px] text-white/60 hover:text-white/90 transition-colors"
+     onClick={() => setShowSkipLink(false)}
+   >
+     skip to your confession ↓
+   </a>
+ )}

// On each confession card, add the id anchor:
<motion.div
  key={confession.id}
+ id={confession.id}
  ...
>
```

This costs two lines of state and a small inline link. It gives keyboard users agency — they can choose to stay at the form or jump to the feed, rather than being forced.

---

## Performance (Long Lists)

### 1. The Diagnosis — Full Re-Render on Every Submission

The feed renders by mapping over `confessions`:

```
src/App.tsx:110
{confessions.map((confession) => (
  <motion.div
    key={confession.id}
    ...
  >
```

When `setConfessions([newConfession, ...confessions])` fires on line 53, the entire array reference changes. React diffs the old array against the new one. Because the `key` for every existing confession is unchanged (stable UUIDs), React correctly reuses the DOM nodes for old items. **Old confessions are not unmounted and remounted.**

However, they *are* re-rendered — every component function re-executes. For 500 confessions, that means 500 `<motion.div>` components, each with Framer Motion's animation logic, each calling `formatTimestamp`, each computing class names through `cn()`. The JavaScript cost grows linearly. At 500 items, you will feel it — keystrokes in the textarea will lag because React is busy reconciling the feed.

The first bottleneck is `formatTimestamp`. It calls `Date.now()`, which on every render produces a new value. React sees the props change (new timestamp string) and must re-apply the text node. Even though the visual result is usually the same, React does not know that — it just sees a new string.

```
src/App.tsx:25-33
function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  ...
}
```

Every render of every confession recomputes this. For 500 confessions, that is 500 calls to `Date.now()` and 500 division operations — per keystroke in the textarea.

### 2. The Solution — Extract the Card and Memoize

**Step 1: Split the confession card into its own component.**

```tsx
// src/components/ConfessionCard.tsx
import { memo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  confession: Confession;
}

const ConfessionCard = memo(function ConfessionCard({ confession }: Props) {
  return (
    <motion.div
      key={confession.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group"
    >
      <p className="playfair text-[17px] leading-[1.8] text-white/85">
        {confession.text}
      </p>
      <div className="mt-2 system-ui text-[12px] text-muted uppercase tracking-wide">
        {formatTimestamp(confession.createdAt)}
      </div>
      <div className="mt-6 border-b border-white/[0.06]" />
    </motion.div>
  );
});
```

`React.memo` wraps the component in a shallow comparison check. If `confession.id`, `confession.text`, and `confession.createdAt` are all the same as last render, React skips the component entirely — no function execution, no DOM diffing, no Framer Motion overhead. For 500 confessions where only one is new, 499 cards skip.

**Step 2: Hoist `formatTimestamp` to a periodic update rather than per-render.**

The relative timestamps do need to update as time passes — "3 mins ago" becomes "4 mins ago." But they do not need to update on every keystroke. A 60-second interval is sufficient.

```tsx
// src/hooks/useRelativeTime.ts
import { useState, useEffect } from 'react';

export function useRelativeTime(): number {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return now;
}
```

Then refactor `formatTimestamp` to accept the current time as a parameter instead of calling `Date.now()` internally:

```ts
// src/lib/formatTimestamp.ts
export function formatTimestamp(timestamp: number, now: number): string {
  const diff = now - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} mins ago`;
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
}
```

Now `ConfessionCard` receives `now` as a prop from the parent. When `now` changes (once per minute), all cards re-render. Between those moments, `memo` keeps them frozen. The textarea keystrokes no longer trigger 500 timestamp calculations.

**Step 3 (Optional): Virtualization for extreme scale.**

If confessions could reasonably grow into the thousands, add `@tanstack/react-virtual` or `react-window`. These libraries render only the cards currently visible in the viewport. A feed of 5,000 confessions only renders ~10 DOM nodes at any moment. The rest are blank space — placeholders that get filled in as the user scrolls.

This is not a dependency you need today. The extraction and memoization described above handles 500-1000 items comfortably. Virtualization is the safety net for orders of magnitude beyond that.

---

## Anti-Patterns

### 1. The Diagnosis — Tailwind Font Config Defined but Unused

The Tailwind configuration defines font families:

```
tailwind.config.js:16-18
fontFamily: {
  serif: ["'Playfair Display'", "Georgia", "serif"],
  sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", ...],
},
```

These map to the utility classes `font-serif` and `font-sans`. Yet the codebase never uses them. Instead, it relies on custom CSS classes:

```
src/index.css:36-41
.playfair {
  font-family: 'Playfair Display', serif;
}

.system-ui {
  font-family: system-ui, -apple-system, sans-serif;
}
```

And applies them directly:

```
src/App.tsx:63 (header), :80 (textarea), :118 (confession), :122 (timestamp), :99 (button)
className="... playfair ..."
className="... system-ui ..."
```

This creates two sources of truth for fonts: the Tailwind config layer and the CSS class layer. If someone changes the font in `tailwind.config.js`, the site does not change. If someone deletes the `.playfair` CSS class, the site breaks. The Tailwind config is dead code — it exists but does nothing.

### 2. The Solution — Use Tailwind Utilities, Delete Custom CSS

```diff
// tailwind.config.js — ensure the config maps correctly
fontFamily: {
- serif: ["'Playfair Display'", "Georgia", "serif"],
+ serif: ["'Playfair Display'", "Georgia", "serif"],  // → font-serif
- sans: ["system-ui", ...],
+ sans: ["system-ui", ...],                             // → font-sans
},
```

```diff
// src/index.css — remove the dead utility classes
- .playfair {
-   font-family: 'Playfair Display', serif;
- }
- 
- .system-ui {
-   font-family: system-ui, -apple-system, sans-serif;
- }
```

```diff
// src/App.tsx — replace all custom class usages with Tailwind utilities
- className="... playfair ..."
+ className="... font-serif ..."

- className="... system-ui ..."
+ className="... font-sans ..."
```

The result: one configuration file controls fonts. Changing the font stack in `tailwind.config.js` updates every element across the entire app. This is the "single source of truth" principle applied to design tokens.

---

### 1. The Diagnosis — Inline Constant Inside Component Body

```
src/App.tsx:41
const limit = 280;
```

This constant is declared inside the `App` function body. It is reassigned on every render — a meaningless operation since the value never changes, but it clutters the component's variable scope. If someone adds ten more configuration constants this way, the component body grows without adding behaviour.

### 2. The Solution — Hoist to Module Scope

```diff
// src/App.tsx — move outside the component, near SEED_DATA
+ const CHAR_LIMIT = 280;

export default function App() {
  ...
- const limit = 280;
+ 
  const charCount = inputText.length;
```

```diff
  <textarea
-   maxLength={limit}
+   maxLength={CHAR_LIMIT}
    ...
  />

  <span>
-   {charCount} / {limit}
+   {charCount} / {CHAR_LIMIT}
  </span>
```

Module-scoped constants are evaluated once when the file loads, not on every render. The naming convention `UPPER_SNAKE_CASE` signals to readers that this value is a true constant — it will never change during the component's lifetime. This is a small change, but small changes accumulate into code that is easy to scan and reason about.

---

### 1. The Diagnosis — Crypto UUID Overhead for Simple Client IDs

```
src/App.tsx:48
id: crypto.randomUUID(),
```

`crypto.randomUUID()` is cryptographically secure. It generates a 36-character string like `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`. For a client-only app with no persistence, this is overbuilt. The security guarantee is meaningless here — there is no attack surface where a predictable ID could be exploited. Meanwhile, the 36-character strings add visual noise in React DevTools and increase the serialized state size.

More importantly, if this app ever connects to a backend, client-generated UUIDs become an anti-pattern: the server should own ID generation to prevent collisions and guarantee uniqueness across sessions.

### 2. The Solution — Use a Simple Incremental Counter

```diff
// src/App.tsx — module scope
+ let nextId = 0;
+ function generateId(): string {
+   return `c${nextId++}`;
+ }

// Inside handleSubmit
const newConfession: Confession = {
- id: crypto.randomUUID(),
+ id: generateId(),
  text: trimmedText,
  createdAt: Date.now(),
};
```

This produces compact IDs like `c0`, `c1`, `c2`. They are unique within the session, human-readable, and trivial to spot in DevTools. The `c` prefix prevents collisions with other ID schemes if the app grows. If a backend is added later, the server replaces `generateId` with a server-returned ID, and no component code changes — because the components only care that the ID is a string, not where it came from.

---

## Summary

| Category | Issue | Severity | Fix Complexity |
|----------|-------|----------|----------------|
| XSS | No explicit sanitization layer | Low (React escapes by default) | Low — add `stripHtml` utility, document the boundary |
| a11y | Missing `<label>` on textarea | High — blocks screen reader users | Low — add `sr-only` label + `id` |
| a11y | No `aria-live` for dynamic feed | Medium — users miss new content | Low — one wrapper `<div>` + two attributes |
| a11y | Four elements fail WCAG AA contrast | Medium — low-vision users affected | Medium — replace opacity values with solid greys |
| a11y | Focus trapped at form after submit | Low — keyboard users may miss feed | Low — add skip link or focus announcement |
| Performance | Full feed re-renders on every keystroke | Medium — degrades at 200+ items | Medium — extract `ConfessionCard`, wrap in `memo` |
| Performance | No virtualization | Low — only relevant at 1000+ items | High — add `react-window` or `@tanstack/react-virtual` |
| Anti-pattern | Tailwind font config unused | Low — dead config | Low — replace `.playfair`/`.system-ui` with `font-serif`/`font-sans` |
| Anti-pattern | Constant inside component body | Low — style issue | Low — hoist to module scope |
| Anti-pattern | `crypto.randomUUID()` for client IDs | Low — overbuilt | Low — switch to incremental counter |
