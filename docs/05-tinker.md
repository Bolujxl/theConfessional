# Tinker Log — The Empty Submission Guard

We are pulling one line out of `handleSubmit` to see what holds the app together.

---

## The original code

`handleSubmit` runs every time the "leave it here" button is clicked. It trims the input, checks it, builds a confession object, and pushes it to the feed:

```ts
const handleSubmit = () => {
  const trimmedText = inputText.trim();
  if (!trimmedText) return;

  const newConfession: Confession = {
    id: crypto.randomUUID(),
    text: trimmedText,
    createdAt: Date.now(),
  };

  setConfessions([newConfession, ...confessions]);
  setInputText('');
  textareaRef.current?.focus();
};
```

---

## The experiment

Remove the empty submission check:

```ts
const handleSubmit = () => {
  const trimmedText = inputText.trim();
  // if (!trimmedText) return;  ← removed

  const newConfession: Confession = {
    ...
  };
};
```

---

## Prediction

Without the guard, `handleSubmit` runs to completion regardless of what is in the textarea. `inputText.trim()` on an empty string returns `""`. That empty string gets wrapped in a `Confession` object with a real UUID and a real timestamp, then pushed to the front of the feed. The app will render a live confession card with no text — just a timestamp and a blank space where the confession should be.

Clicking "leave it here" on an empty box will look like it worked. Nothing will indicate failure.

---

## Result

The prediction was correct.

Submitting with an empty textarea pushed a blank card into the feed. It had a timestamp ("just now"), a separator line, and nothing between them. The card was structurally complete — the app treated blank text as a valid confession.

Clicking submit repeatedly stacked multiple blank cards on top of one another. The feed degraded silently with no error, no warning, and no feedback to the user that something was wrong.

---

## What this taught me

`if (!trimmedText) return` is not defensive over-engineering. It is the only thing standing between the user and a corrupted feed. Without it:

- `.trim()` does its job — it removes invisible whitespace — but it has no power to stop the function from continuing.
- `setConfessions` does not inspect the text. It accepts whatever it is given. An empty string is a string.
- The feed renders each confession unconditionally. If the text is `""`, it renders `""`.

The guard is one line. What it protects against is the entire chain of code that follows it running on garbage input. Removing it proved that every step below operates in good faith — none of them check whether the content is meaningful. The guard is the only thing that does.

It was put back immediately.