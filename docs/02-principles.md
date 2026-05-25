# Software Engineering Principles Audit

## Controlled Components
### Definition
A controlled component surrenders its internal DOM state to React state. The form element's `value` is bound to a state variable, and every user interaction fires an `onChange` handler that updates that variable—React owns the single source of truth, not the browser's native input buffer.

### Code References
* **File:** `src/App.tsx`
    * **Lines:** `75-76`
    * **Context:** The `<textarea>` element has `value={inputText}` bound directly to the `inputText` state hook (declared on line 37). Every keystroke triggers `onChange={(e) => setInputText(e.target.value)}`, which pushes the new raw value into state. Without this binding, the textarea would self-manage its content, and `handleSubmit` (line 43) would read a stale or empty value because React's memory (`inputText`) would never have been synchronised with the DOM. The `maxLength={limit}` prop (line 77) is also passed declaratively rather than relying on HTML-native enforcement alone.

---

## Immutability
### Definition
State updates must never mutate existing objects or arrays in place. Instead, a new copy is created with the desired changes applied, and that copy replaces the old reference. This guarantees React's reconciliation engine can detect changes via reference equality (`===`) rather than deep comparisons, and prevents race conditions in concurrent rendering.

### Code References
* **File:** `src/App.tsx`
    * **Lines:** `47-53`
    * **Context:** On submission, a brand-new `Confession` object is constructed as a fresh literal (`{ id: crypto.randomUUID(), text: trimmedText, createdAt: Date.now() }`). The existing `confessions` array is never touched with `.push()`, `.splice()`, or index assignment. Instead, `setConfessions([newConfession, ...confessions])` spreads the old array into a new one with the new item prepended. The original array reference is preserved for React's internal diffing.
    * **Lines:** `54`
    * **Context:** `setInputText('')` passes a new empty string rather than mutating a string variable. Strings are immutable by definition in JavaScript, but the pattern is consistent: the setter always receives a new value, never a mutated reference.
    * **Lines:** `76`
    * **Context:** `setInputText(e.target.value)` receives a new string from the DOM event on every keystroke. The previous value is never modified in place.

---

## Lifting State Up
### Definition
When two or more sibling components need to read or write the same piece of data, that data is stored in their closest common ancestor. The ancestor owns the state and passes it down as props, ensuring a single source of truth rather than duplicated or out-of-sync local states.

### Code References
* **File:** `src/App.tsx`
    * **Lines:** `36-37`, `72-128`
    * **Context:** Both `inputText` and `confessions` are declared at the top of the `App` component (lines 36-37). The form section (lines 72-105) consumes `inputText` for the controlled textarea and `confessions` for the submit handler that prepends new entries. The feed section (lines 108-128) reads `confessions` to render the list. These are sibling regions within `App` that share the same state—the form writes, the feed reads. No child component holds a private copy. If state were kept locally inside a hypothetical `<Form />` child, the feed would have no access to updated confessions after submission.
    * **Lines:** `43-56` (handler) + `96` (button)
    * **Context:** The `handleSubmit` function is defined in `App` (line 43), not inside a child. It closes over `inputText`, `confessions`, `setConfessions`, and `setInputText`. The button at line 96 receives it via `onClick={handleSubmit}`, keeping all mutation logic anchored at the top level.

---

## Separation of Concerns (SoC)
### Definition
Business logic (state transitions, validation, data transformation) is extracted from presentation markup (JSX, styling, layout). Each file or abstraction layer handles one category of concern, making the system testable and swappable without rewriting unrelated code.

### Code References
* **File:** `src/main.tsx`
    * **Lines:** `1-14`
    * **Context:** This file is a pure entry-point shell. It imports React, locates the DOM mount point, and renders `<App />`. It contains zero business logic, zero styling, and zero data definitions. Its only concern is booting the runtime.
* **File:** `src/index.css`
    * **Lines:** `1-42`
    * **Context:** Contains only Tailwind directives, global resets, scrollbar styling, and two font utility classes. No component logic, no state, no JavaScript. Presentation-only.
* **File:** `src/react-app-env.d.ts`
    * **Lines:** `1-74`
    * **Context:** Type declarations only. Isolates ambient module and type definitions from runtime code. No executable logic resides here.
* **File:** `tailwind.config.js`
    * **Lines:** `1-23`
    * **Context:** Design tokens (colours, font families) live in a dedicated configuration file, not hardcoded throughout components. Changing the design system requires touching only this file.

### Gap Analysis
* **File:** `src/App.tsx`
    * **Lines:** `1-132`
    * **Context:** Violates SoC. A single file and single component houses: a utility function (`cn`, lines 7-9), a data interface (`Confession`, lines 11-15), seed data (`SEED_DATA`, lines 17-23), a formatting function (`formatTimestamp`, lines 25-33), state declarations (lines 36-38), form submission logic (lines 43-56), the form JSX (lines 72-105), the feed JSX (lines 108-128), and animation configuration. No extraction into custom hooks (`useConfessions`, `useFormInput`) or separate presentational components (`<ConfessionCard />`, `<SubmissionForm />`) exists. The `formatTimestamp` and `cn` utilities should be in a `src/lib/` module. Seed data belongs in a `src/data/` module. The `Confession` interface belongs in a `src/types/` module.

---

## Single Responsibility Principle (SRP)
### Definition
A function, component, or module should have exactly one reason to change. Each unit of code is accountable for one stakeholder or one axis of behaviour. If a unit handles multiple responsibilities, a change to any one of them risks breaking the others.

### Code References — Adhered
* **File:** `src/App.tsx`
    * **Lines:** `7-9`
    * **Context:** The `cn` function has one job: accept an arbitrary number of class-value inputs, flatten them via `clsx`, and resolve Tailwind conflicts via `twMerge`. It knows nothing about components, state, or the DOM. If the class-merging strategy changes, only this function changes.
    * **Lines:** `25-33`
    * **Context:** `formatTimestamp` has one job: convert a millisecond timestamp into a human-readable relative time string. It receives a number, returns a string, and touches no external state. If timestamp formatting rules change, only this function changes.
    * **Lines:** `11-15`
    * **Context:** The `Confession` interface has one job: define the shape of a confession object. If the data model changes, only this interface changes.
    * **Lines:** `17-23`
    * **Context:** `SEED_DATA` has one job: provide the initial array of seed confessions. It is a static constant with no logic.
* **File:** `src/main.tsx`
    * **Lines:** `1-14`
    * **Context:** One job: mount the React application to the DOM. If the mounting strategy changes (e.g., switching to `hydrateRoot` for SSR), only this file changes.

### Code References — Violated
* **File:** `src/App.tsx`
    * **Lines:** `35-132`
    * **Context:** The `App` component violates SRP across multiple axes. It manages form state (what the user is typing), manages feed state (the list of confessions), handles form submission and validation, renders the form UI, renders the feed UI, and configures animation behaviour. A change to the form layout (lines 72-105) and a change to the feed rendering (lines 108-128) require modifying the same component. A change to the validation rule (line 45) lives alongside the animation transition values (line 115). The component should be decomposed: a `useConfessionFeed` hook for list management, a `useFormInput` hook for controlled input state, a `<SubmissionForm>` component for the form markup, and a `<ConfessionCard>` component for individual feed items.

---

## Custom Hooks
### Definition
A custom hook encapsulates stateful logic and side effects into a reusable function whose name begins with `use`. It allows components to share behaviour without sharing markup, and keeps the component body focused on rendering.

### Code References
**Not found within current workspace.**

No custom hooks exist. The `App` component at `src/App.tsx:35-132` holds all state and side-effect logic inline. The `useState` and `useRef` calls (lines 36-38) are React built-ins, not extracted abstractions. A `useConfessions` hook could encapsulate the seed-data initialisation and the `handleSubmit` logic; a `useFormInput` hook could encapsulate the controlled textarea and character-count logic. Neither exists.

---

## Declarative Data Flow
### Definition
The UI is a pure function of state. At any given moment, the rendered output is fully determined by the current state values. Data flows downward from state to markup; user actions flow upward through event handlers that update state, triggering a re-render that reflects the new state.

### Code References
* **File:** `src/App.tsx`
    * **Lines:** `108-128` → `36`
    * **Context:** The feed section renders `confessions.map(...)` directly from the `confessions` state. There is no imperative DOM manipulation, no manual node insertion, no `appendChild` calls. When `setConfessions` fires on line 53, React re-executes the render function, the map produces a new array of `<motion.div>` elements, and React's reconciler diffs and patches the DOM. The UI is always a reflection of state, never modified outside the render cycle.
    * **Lines:** `75-76` → `37`
    * **Context:** The textarea's displayed value is a direct projection of `inputText`. No imperative `.value = '...'` assignments exist on the textarea DOM node.

---

## Animation-Driven State (Framer Motion)
### Definition
Animation libraries can be declaratively integrated into React's rendering model by mapping visual properties (`opacity`, `y`) to component lifecycle phases (`initial`, `animate`, `exit`) rather than imperative timeline scripting.

### Code References
* **File:** `src/App.tsx`
    * **Lines:** `111-115`
    * **Context:** Each confession card uses `motion.div` with declarative `initial`, `animate`, and `transition` props. No `requestAnimationFrame` loops, no manual style interpolation, no timeout callbacks for animation sequencing. The `opacity` and `y` values are declared as plain objects, and Framer Motion computes the intermediate frames. The `key={confession.id}` on line 112 enables React and Framer Motion to track individual elements across renders.
    * **Lines:** `109`
    * **Context:** `<AnimatePresence initial={false}>` wraps the feed. This component registers exit animations for elements removed from the list. The `initial={false}` prop suppresses entrance animations on the initial mount, preventing the seed confession from animating in on page load. If a delete feature were added, `AnimatePresence` would handle the exit transition without additional imperative code.
