# Mood Audit — What Breaks the Feeling and How to Fix It

Three things quietly work against the confessional atmosphere the app is reaching for.
Each one has a concrete fix.

---

## Problem 1 — The character counter is a Twitter reflex

### What is wrong

The counter shows `0 / 280` in the bottom-right corner of the textarea. It turns amber at
241, red at 280. This is a pattern people have seen a thousand times on social platforms.
It signals: *you are composing a post*. A confessional is not a post. The number makes you
aware of performance — how much space you are using, whether you are being concise. That
awareness is the opposite of what a confession needs.

The limit being 280 makes it worse. That number carries specific cultural memory.

### The fix

Hide the counter entirely until the user is close to the limit. Below 220 characters, show
nothing. At 220, fade it in quietly. The counter only needs to exist when it carries
urgent information — *you are about to run out of room*. The rest of the time it should
be invisible.

```diff
// src/App.tsx
- charCount >= 280 ? "text-danger" : charCount >= 241 ? "text-warning" : "text-muted"
+ charCount >= 280 ? "text-danger" : charCount >= 241 ? "text-warning" : "opacity-0 pointer-events-none"
```

The counter is still in the DOM — it does not jump into place when it appears — it simply
fades in from invisible. `pointer-events-none` prevents accidental interaction while hidden.

Separately, consider raising the limit to 500 or removing it entirely. 280 is a
social-media number. A confession does not have a character limit.

---

## Problem 2 — The feed is a receipt, not a release

### What is wrong

After you submit a confession, it slides up to the top of the feed and stays there. All
your previous confessions stay there too. You are not leaving anything behind — you are
building a visible log of everything you said. The app calls this "the feed" internally,
and that name reveals the problem: a feed is for consumption. A confessional is for
release.

The animation reinforces this. The confession slides *up*, toward you. It arrives on your
screen like a delivery. The emotional direction is backwards — the thing should feel like
it is going away, not coming toward you.

There is also a second problem: the newest confession appears at the top, directly below
the textarea. You have just written something you wanted to leave behind, and now it is
right in front of you, the first thing you see.

### The fix — Ephemeral cards

Confessions should fade out and disappear after a short window — long enough to confirm
the submission, short enough to feel like release. Thirty seconds is about right.

This requires a timestamp-based opacity calculation and a cleanup interval:

```ts
// src/hooks/useEphemeral.ts
import { useState, useEffect } from 'react';
import type { Confession } from '../types';

const VISIBLE_MS = 30_000; // 30 seconds

export function useEphemeral(confessions: Confession[]) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  return confessions.map((c) => ({
    ...c,
    opacity: Math.max(0, 1 - (now - c.createdAt) / VISIBLE_MS),
    gone: now - c.createdAt > VISIBLE_MS,
  }));
}
```

Then in the feed, filter out gone cards and apply the opacity as an inline style so Framer
Motion does not fight the fade:

```tsx
// src/App.tsx
const ephemeral = useEphemeral(confessions);
const visible = ephemeral.filter((c) => !c.gone);
```

The seed confession should be exempt from this — it should always be visible as the anchor
that sets the register. Give it a special flag or exclude it by ID.

### The fix — Append at the bottom, not the top

New confessions should appear at the bottom of the feed, below the ones that came before.
This changes the emotional direction: you write something, it descends, it joins what came
before it, it begins to recede.

```diff
// src/App.tsx — handleSubmit
- setConfessions([newConfession, ...confessions]);
+ setConfessions([...confessions, newConfession]);
```

The animation stays the same (`y: 16 → y: 0`) but now it arrives quietly at the end of
the list instead of pushing everything else down.

---

## Problem 3 — The button is too wide and too official

### What is wrong

A full-width, bordered, 48-pixel-tall rectangle reads as: *submit form*. It has the shape
of a bank transfer button. The copy — *leave it here* — is doing emotional work that the
button's shape immediately undercuts. The visual message is clinical. The text message is
intimate. They fight each other.

### The fix

Make the button recede. Remove the border. Shrink it to the width of its text. Push it
to the right — a small, quiet option sitting in the corner, not a demand.

```diff
// src/App.tsx
- <button
-   onClick={handleSubmit}
-   className={cn(
-     "w-full h-12 mt-3 bg-white/[0.06] border border-white/10 rounded-[10px]",
-     "text-white/60 font-sans text-[14px] tracking-[0.08em]",
-     "hover:bg-white/10 hover:text-white/90 transition-all duration-200"
-   )}
- >
-   leave it here
- </button>
+ <div className="flex justify-end mt-4">
+   <button
+     onClick={handleSubmit}
+     className="font-sans text-[13px] tracking-[0.08em] text-white/35 hover:text-white/70 transition-colors duration-200"
+   >
+     leave it here
+   </button>
+ </div>
```

No background. No border. No fixed height. Just the words, faint, to the right.
The hover lifts them slightly into visibility — enough to confirm it is interactive,
not enough to make it feel like a CTA.

---

## Summary

| What is broken | Why it breaks the mood | The fix |
|---|---|---|
| Character counter always visible | Social media pattern; makes you aware of performance | Hide below 220 chars; fade in only when urgent |
| Confessions accumulate at the top | Feels like a log, not a release; animation direction is wrong | Fade out after 30s; append to bottom not top |
| Full-width bordered button | Form-submit energy undermines the intimate copy | Plain text button, right-aligned, no border |

None of these are large changes. Together they shift the app from *a form that collects
confessions* to *a place where you leave one*.
