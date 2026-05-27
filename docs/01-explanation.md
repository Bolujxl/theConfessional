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

---

# Tidying up the room — Modular Architecture

As an app grows, putting everything in one file is like keeping all your toys, clothes, and books in one giant pile. It’s hard to find anything!

We "refactored" the app by tidying up. We split the code into different folders:
- **`src/components`**: For visual pieces like the `ConfessionCard`.
- **`src/hooks`**: For special powers like our automatic timer.
- **`src/lib`**: For utility tools like our text cleaner.
- **`src/types.ts`**: The blueprint that describes what a "Confession" looks like.

---

# The memory bank — what state is

State is the app's piggy bank. It is how the app remembers things while it runs. This version introduces the concept of "ghost" memory:

```ts
src/App.tsx:25-32
const [confessions, setConfessions] = useState<Confession[]>(SEED_DATA);
const [inputText, setInputText] = useState('');
...
const ephemeral = useEphemeral(confessions);
const visible = ephemeral.filter((c) => !c.gone);
```

- **`confessions`**: The master list of everything written.
- **`ephemeral`**: A processed version of that list where each confession has an "opacity" (how visible it is).
- **`visible`**: The actual list shown on screen. It filters out anyone who has completely faded away.

---

# The Vanishing Ink — `useEphemeral`

This is the most "magical" part of the app. In a real confessional, you speak your words and they vanish into the air. We wanted the app to feel the same way.

```ts
src/hooks/useEphemeral.ts:23-24
const opacity = Math.max(0, 1 - (now - c.createdAt) / VISIBLE_MS);
return { ...c, opacity, gone: opacity === 0 };
```

Confessions aren't permanent. They are written in "vanishing ink" that lasts for exactly 30 seconds (`VISIBLE_MS`). 
- As soon as you hit submit, the timer starts.
- Every second, the confession gets a little more transparent.
- After 30 seconds, it becomes invisible and "gone."

The only exception? **Statement 1** (the seed confession) is a permanent landmark that never fades.

---

# The Automatic Timer — `useRelativeTime`

To make the vanishing ink work, the app needs to check the time constantly.

```ts
src/hooks/useRelativeTime.ts:6-9
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 1_000); // Ticks every second
  return () => clearInterval(id);
}, []);
```

This hook "ticks" every second. This forces the app to recount how old each confession is and update its transparency. It's the heartbeat of the app.

---

# The Cleaning Robot — `stripHtml`

To keep the app safe, we use a tool called `stripHtml`. It's like a car wash for your words—it scrubs away any hidden code people might try to sneak in.

---

# Accessibility — Making the app talkable

1.  **Labels**: We added a hidden `label` to the text box so screen readers can explain it.
2.  **Live Regions**: `aria-live="polite"` tells the screen reader to announce new confessions when they appear.
3.  **The Skip Link**: A "teleporter" for keyboard users. Since new confessions now appear at the **bottom** of the list, the skip link takes you straight to the end of the page.

---

# Pro Moves — Keyboard Shortcut & Order

```ts
src/App.tsx:48
setConfessions([...confessions, newConfession]);
```

- **New Order**: We now add new confessions to the **bottom** of the list (`...confessions` comes first). This makes the feed feel like a continuous scroll of secrets.
- **Shortcut**: Holding **Cmd/Ctrl + Enter** submits instantly. 

---

# Performance — The Efficient Painter

```ts
src/components/ConfessionCard.tsx:11
const ConfessionCard = memo(function ConfessionCard(...) {
```

The word `memo` tells React to "memorize" the card. If the text hasn't changed, React doesn't waste energy drawing it again. This is vital because the app re-draws every second to handle the fading effect!

---

# Being Gentle — `useReducedMotion`

If a user has "Reduce Motion" turned on in their computer settings, the confessions will simply fade in without the sliding movement. We want the experience to be peaceful for everyone.

---

# UI Details — The Disappearing Counter

```ts
src/App.tsx:93-96
charCount >= 280 ? "text-danger" : charCount >= 241 ? "text-warning" : "opacity-0 pointer-events-none"
```

The character counter is shy. It stays completely invisible (`opacity-0`) until you've typed 241 characters. It only appears when you actually need to worry about the 280-character limit. This keeps the screen clean and distraction-free.
