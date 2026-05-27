# Adversarial Architecture Audit (Lie Detector)

*4 of these 5 statements are true. 1 is a lie. Can you spot it?*

---

## The Five Technical Statements

### Statement 1
The app has no `<form>` element. The submit button at `App.tsx:95-104` is a plain `<button>` with `onClick={handleSubmit}`. The textarea has no `name` attribute, no `form` attribute, and no enclosing `<form>` tag. Confessions are dispatched via direct function invocation rather than HTML form submission events — which means pressing Enter inside the textarea inserts a newline rather than triggering submission. Only clicking the button calls `handleSubmit`.

### Statement 2
`crypto.randomUUID()` at `App.tsx:48` is called inside `handleSubmit` — an event handler, not during render. It uses the browser's native Web Crypto API to generate a v4 UUID string (e.g. `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`) for each new confession. This UUID serves as the `key={confession.id}` prop at line 112, giving React and Framer Motion a stable, globally-unique identity for every list item.

### Statement 3
`formatTimestamp` at `App.tsx:25-33` computes the difference between the current time and a confession's `createdAt` field, then divides to extract whole minutes and hours. `Math.floor` truncates the decimal portion. A confession created 59 minutes and 59 seconds ago displays as `"59 mins ago"` — not `"1 hr ago"` — because `Math.floor(59.9833...)` yields `59`, and `59 < 60` routes to the minutes branch. The function is called inline within the JSX at line 122 with no memoization, no caching, and no throttling.

### Statement 4
`<AnimatePresence initial={false}>` at `App.tsx:109` wraps the confession feed. The `initial={false}` prop tells Framer Motion to skip entry animations for elements already present on first mount. Each `<motion.div>` inside declares `initial={{ opacity: 0, y: 16 }}` (starting invisible, 16px too low), `animate={{ opacity: 1, y: 0 }}` (ending fully visible at the natural position), and `transition={{ duration: 0.5, ease: 'easeOut' }}` (half-second decelerating motion). The `key={confession.id}` at line 112 is how Framer Motion knows which element entered and which existed before.

### Statement 5
The `inputText` state is initialised with `useState('')` at `App.tsx:37` and reset to `''` via `setInputText('')` at line 54 upon successful submission. Because `''` and `''` are `Object.is`-equal — identical primitive strings — React 18's automatic batching treats the `setInputText('')` call as a bail-out and skips the update. The component does not re-render from this call alone, meaning the textarea remains visually unchanged until the next keystroke fires `onChange` and forces a fresh `setInputText`.

---

*Which statement is the lie, and why?*

**Statement 5** is the lie. At `App.tsx:53`, `setConfessions([newConfession, ...confessions])` fires *before* `setInputText('')` at line 54 — producing a new array reference that React treats as a state change. Even if `setInputText('')` alone would bail out (empty-to-empty is `Object.is`-equal), the `setConfessions` call guarantees a re-render. During that re-render, the component reads `inputText` from React's internal fiber state, finds `''`, and the textarea renders empty. The claim that the textarea "remains visually unchanged until the next keystroke" contradicts the fact that `setConfessions` forces a synchronous commit.
