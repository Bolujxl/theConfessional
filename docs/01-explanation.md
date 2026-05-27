# Where it all begins — the HTML page that loads everything

Before any code runs, the browser needs a starting point. Think of it like a theatre stage before the actors come out. The stage itself sits there, dark and empty, waiting.

This is the `index.html` file — the stage. It tells the browser three things: what the tab should be called ("The Confessional"), what tiny icon to show next to the tab name, and where to find the code that brings the page to life.

Look at line 26 — it points to `/src/main.tsx`. That is the first actor stepping onto the stage. Everything starts there.

```html
index.html:1-28
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Confessional</title>
    ...
  </head>
  <body class="bg-background text-white selection:bg-white/10">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Line 25 creates an empty box with the name `root`. React — the magic that builds everything you see — will fill that box with the whole app. Without that empty box, React has nowhere to build anything.

---

# Tidying up the room — Modular Architecture

As an app grows, putting everything in one file is like keeping all your toys, clothes, and books in one giant pile. It’s hard to find anything!

We "refactored" the app by tidying up. We split the code into different folders:
- **`src/components`**: For visual pieces like the `ConfessionCard`.
- **`src/hooks`**: For special powers like our automatic timer.
- **`src/lib`**: For utility tools like our text cleaner.
- **`src/types.ts`**: The blueprint that describes what a "Confession" looks like.

This makes the code much easier for humans to read and fix.

---

# The memory bank — what state is

State is the app's piggy bank. It is how the app remembers things while it runs. This version remembers a few more things than the last one:

```ts
src/App.tsx:25-29
const [confessions, setConfessions] = useState<Confession[]>(SEED_DATA);
const [inputText, setInputText] = useState('');
const [showSkipLink, setShowSkipLink] = useState(false);
const textareaRef = useRef<HTMLTextAreaElement>(null);
const now = useRelativeTime();
```

- **`showSkipLink`**: A new memory that remembers if we should show a "teleporter" link to help keyboard users jump straight to their new confession.
- **`now`**: This isn't just a number; it's a dynamic value from our special `useRelativeTime` hook. It's like a clock that ticks in the background.

---

# The Automatic Timer — `useRelativeTime`

In the old version, if a confession said "just now," it would stay saying "just now" forever unless you refreshed the page. That's a bug!

We built a **Hook** (a reusable special power) to fix this:

```ts
src/hooks/useRelativeTime.ts:6-9
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 60_000);
  return () => clearInterval(id);
}, []);
```

Every 60 seconds (that's the `60_000` milliseconds), this hook "ticks" and updates the time. This forces the app to recount how old each confession is. It's like having a little robot that wakes up once a minute to update all the clocks on your wall.

---

# The Cleaning Robot — `stripHtml`

Some people might try to be tricky and type code into the confession box to break the website. This is called an "injection attack."

To stop them, we use a tool called `stripHtml`:

```ts
src/App.tsx:37-41
const sanitizedText = stripHtml(trimmedText);

const newConfession: Confession = {
  ...
  text: sanitizedText,
};
```

Before the confession is saved, it passes through the cleaner. The cleaner takes out any hidden HTML tags (like `<script>` or `<div>`) and leaves only the plain, safe text. It’s like a car wash for your words.

---

# Accessibility — Making the app talkable

We made the app better for people who use "Screen Readers" (tools that read the screen out loud for people who can't see it).

1.  **Labels**: We added a `label` to the text box. Even though you can't see it (`sr-only`), a screen reader will find it and say "Write your anonymous confession."
2.  **Live Regions**: We added `aria-live="polite"` to the feed. This tells the screen reader: "Hey, when a new confession appears, wait for a natural pause and then tell the user."
3.  **The Skip Link**: When you submit, a link appears that says "skip to your confession." This is a "teleporter" for people using keyboards, letting them jump over the typing box straight to what they just wrote.

---

# Pro Moves — The Keyboard Shortcut

Typing a confession and then having to find your mouse to click "leave it here" can break your flow.

```ts
src/App.tsx:74-79
onKeyDown={(e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
  }
}}
```

We added a "Pro Move": If you hold down **Command** (on a Mac) or **Control** (on Windows) and press **Enter**, the app submits your confession automatically. It’s a fast lane for your thoughts.

---

# Performance — The Efficient Painter

React usually likes to redraw everything when something changes. But if you have 100 confessions and you're just typing one new letter, redrawing 100 old cards is a waste of energy!

```ts
src/components/ConfessionCard.tsx:11
const ConfessionCard = memo(function ConfessionCard(...) {
```

The word `memo` is short for "memorize." It tells React: "Look at this card. If the confession text inside it hasn't changed, don't bother repainting it. Just use the drawing you made last time." This keeps the app feeling snappy and fast, even if there are hundreds of confessions in the feed.

---

# Being Gentle — `useReducedMotion`

Some people get dizzy or feel sick when things slide and fade on a screen.

```ts
src/components/ConfessionCard.tsx:12-19
const shouldReduceMotion = useReducedMotion();

return (
  <motion.div
    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
    ...
```

The app checks the user's computer settings. If they have "Reduce Motion" turned on, we respect that. Instead of sliding from below (`y: 16`), the confession just fades in quietly where it belongs. It’s our way of being a polite and gentle guest in their browser.

---

# Why this matters

The code might look more complicated now, but it's actually much stronger.
- It’s **Modular** (organized).
- It’s **Accessible** (works for everyone).
- It’s **Performant** (fast).
- It’s **Secure** (clean).

Every one of these changes was made to make the app feel more human, more reliable, and more intentional.
