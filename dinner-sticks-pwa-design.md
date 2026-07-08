# Dinner Sticks — Product Design Document (Platform-Agnostic)

**Purpose of this document**: describe what Dinner Sticks _does_ — its concepts, data, rules, screens, and behaviors — independent of any programming language, framework, or storage engine, so the app can be faithfully rebuilt in a new environment (specifically: as a Progressive Web App). This document intentionally says nothing about how to build it; it says what it must do.

Source of truth: `specs/001-dinner-sticks-app/` (the original product spec) and the existing implementation, which were found to agree on every point covered below.

---

## 1. Overview & Concept

Dinner Sticks solves nightly decision fatigue around "what's for dinner." Instead of deciding fresh every day, the user front-loads the decision once a week and then draws from a short, pre-committed list each night.

The metaphor is literal: meal ideas are written on virtual popsicle sticks and kept in a jar (a **Pool**). Once a week, the user draws a handful of sticks out of the jar into a **Weekly Bin** — the working set for the week. Each night, the user either draws a stick from the bin at random or picks one manually, and marks it "Done" once eaten.

Three-tier model:

1. **Pool** — the long-lived master list of everything the household might ever eat. Edited occasionally (add/rename/delete ideas). Multiple pools can exist (e.g. "Dinner," "Breakfast," "Lunch"), each independent.
2. **Weekly Draw** — a one-time-per-week randomization event: pull up to 5 sticks out of a pool, review them (swap out any you don't want), and confirm.
3. **Weekly Bin** — the confirmed result of a draw: the week's active short list, shown as the app's main screen. From here the user picks tonight's meal and marks things done as the week goes on.

Nothing is destroyed by daily use. Discarding a stick during a draw, removing one from the bin, or marking one "Done" never deletes it from its pool — ideas remain available for future weeks. The **only** way to permanently lose an idea is to explicitly delete it from its pool.

The app is single-user, single-device, and fully offline: no accounts, no login, no network dependency, no cloud sync. All data lives locally and must survive app/browser restarts indefinitely.

---

## 2. Domain Glossary

| Term                          | Meaning                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pool**                      | A named master list of meal ideas (e.g. "Dinner"). Always at least one exists.                                                                                   |
| **Stick**                     | A single meal idea, belonging to exactly one pool.                                                                                                               |
| **Weekly Bin** (or "the bin") | The confirmed set of sticks selected for the current week, for one pool. At most one active bin per pool.                                                        |
| **Draw**                      | The act of randomly selecting sticks from a pool. Happens both when starting a new week (up to 5 at once) and when replacing a single bin stick (one at a time). |
| **Selection Session**         | The temporary, in-progress state of a weekly draw, before the user confirms it. Exists only in the running app; discarded if the app closes before confirming.   |
| **Done**                      | A bin stick the user has eaten/used this week; removed from the active bin view but not deleted from the pool.                                                   |

---

## 3. Data Model

All persisted data is local to the device/browser. There is no server-side representation of any of this.

### Pool

| Field     | Type       | Rules                                                                                             |
| --------- | ---------- | ------------------------------------------------------------------------------------------------- |
| id        | identifier | Immutable once created                                                                            |
| name      | text       | Non-empty. Unique, case-insensitively, across **all** pools (e.g. "Dinner" and "dinner" collide). |
| createdAt | timestamp  | Set at creation, immutable                                                                        |

Rules:

- At least one pool must always exist. Deleting the last remaining pool immediately auto-creates a new, empty pool named "Dinner" as part of the same operation — the app can never end up with zero pools.
- A fresh install starts with exactly one pool: an empty pool named "Dinner."

Relationships: one pool has many sticks; one pool has zero or one weekly bin.

### Stick

| Field     | Type             | Rules                                                                                                                           |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| id        | identifier       | Immutable once created                                                                                                          |
| poolId    | reference → Pool | Required                                                                                                                        |
| name      | text             | Non-empty (trimmed). Unique, case-insensitively, **within its own pool only** — the same name may exist in two different pools. |
| createdAt | timestamp        | Set at creation, immutable                                                                                                      |

Rules:

- A stick can be referenced by its pool's weekly bin at most once at a time.
- Deleting a stick does **not** clean up any bin that currently references it — the reference becomes stale and is simply filtered out of the bin's displayed contents (see §6) until the user removes or marks it done. A stale (deleted) stick is never eligible for future draws.

### Weekly Bin

| Field          | Type                             | Rules                                                                                                                                                                                                                                                                                                                     |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id             | identifier                       | —                                                                                                                                                                                                                                                                                                                         |
| poolId         | reference → Pool                 | Unique — one bin per pool at a time                                                                                                                                                                                                                                                                                       |
| activeStickIds | ordered list of Stick references | May contain stale references if the underlying stick was later deleted from its pool. May have fewer than 5 entries if the pool had fewer than 5 sticks at draw time. May exceed 5 entries if the user has since used the Add action (§4.4a) — the 5-cap applies only to the initial draw, not to the bin's ongoing size. |
| doneStickIds   | list of Stick references         | Sticks marked "Done" this week. Disjoint from `activeStickIds` — marking a stick done **moves** it from the active list to the done list; it does not appear in both.                                                                                                                                                     |
| createdAt      | timestamp                        | When this bin was confirmed                                                                                                                                                                                                                                                                                               |
| updatedAt      | timestamp                        | Last time the bin changed (replace/remove/add/done)                                                                                                                                                                                                                                                                       |

Rules:

- Starting a new draw when a bin already exists for that pool requires the user to explicitly confirm replacing it.
- Removing a stick from the bin drops it from `activeStickIds` (or `doneStickIds` if already done) but leaves it untouched in its pool.
- Marking a stick "Done" is atomic and idempotent: it always ends with the stick present in `doneStickIds` and absent from `activeStickIds`, whether or not it was already done.
- Adding a stick (§4.4a) appends it to `activeStickIds`; the list is otherwise unbounded above (only bounded by the pool's own stick count, since candidates come from sticks not already in the bin).

### Selection Session (transient — never persisted)

Represents an in-progress weekly draw. Exists only while the draw screen is open; if the app is closed or the draw is cancelled before confirming, it disappears entirely and the previous bin (if any) is left completely unchanged.

| Field             | Type                | Notes                                                                                    |
| ----------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| poolId            | reference → Pool    | Which pool is being drawn from                                                           |
| drawnStickIds     | ordered list, max 5 | Currently drawn, pending confirmation                                                    |
| discardedStickIds | set                 | Discarded so far _this session_; permanently ineligible for the remainder of the session |

### Entity relationships

```
Pool ──────────────────────── Stick
 │  (one pool : many sticks)   │
 │                              │
 └──── Weekly Bin ─────────────┘
       (references sticks by id;
        does not own or copy them)
```

### Validation rules summary

| Entity            | Field                   | Rule                                                                             |
| ----------------- | ----------------------- | -------------------------------------------------------------------------------- |
| Pool              | name                    | Non-empty; unique case-insensitively across all pools                            |
| Pool              | deletion                | Auto-create empty "Dinner" pool if this was the last remaining pool              |
| Stick             | name                    | Non-empty; unique case-insensitively within its own pool                         |
| Stick             | deletion while in a bin | Bin keeps the (now-stale) reference; it's excluded from what's shown to the user |
| Weekly Bin        | activeStickIds          | Length ≤ pool's current stick count                                              |
| Weekly Bin        | doneStickIds            | Disjoint from activeStickIds                                                     |
| Selection Session | drawnStickIds           | Max 5; never includes anything in discardedStickIds                              |

---

## 4. Core Functional Requirements

### 4.1 Build a meal pool

- A fresh install provides one empty pool, "Dinner."
- The user can add a meal idea to any pool by entering a name; a duplicate name (case-insensitive) within that same pool is rejected with an inline warning at the point of entry.
- The user can rename any existing stick; the same duplicate-name check applies.
- The user can permanently delete a stick from a pool; it will never appear again (including in future draws).
- All of the above persist immediately and survive closing/reopening the app with zero data loss.

### 4.2 Run the weekly draw

- The user can trigger a new draw for any pool. The system immediately draws up to 5 sticks at random, without repeats, from that pool's current stick list.
- If the pool has fewer than 5 sticks, all of them are drawn and the user is told the count is reduced.
- While reviewing the draw (before confirming), the user can discard any individual drawn stick. Discarding immediately draws a replacement from the remaining eligible sticks, if any are left. A discarded stick cannot be redrawn again during this same session, though it remains fully available in the pool for future weeks.
- If every eligible stick has been discarded and none remain to redraw, the user is told so and must either confirm the current (smaller) set or cancel the whole draw.
- Confirming saves the drawn set as the pool's new weekly bin, replacing any previous one, and returns to the main screen.
- If a bin already exists for that pool, starting a new draw requires the user to explicitly confirm they want to replace it before the draw begins.
- Cancelling, backing out, or force-closing the app before confirming discards the whole in-progress draw; the previous bin (if any) is left exactly as it was.
- Triggering a draw on a pool with zero sticks informs the user and directs them to add ideas first, without starting a draw.

### 4.3 Pick tonight's meal

- The app's main screen shows the active pool's current bin (its not-yet-done sticks) as the primary content, whenever it has at least one entry.
- One tap/action lets the user highlight a random pick among the bin's current (not-done) sticks.
- The user can instead manually select any specific stick shown in the bin.
- Either way, selecting a stick only highlights it — nothing is removed or changed in storage until the user explicitly marks it "Done."
- Marking a stick "Done" removes it from the bin's active view; it remains fully intact in the pool for future weeks.
- When the bin is empty — no bin exists yet, or every bin stick has been marked done/removed — the main screen shows an empty-state prompt instead, offering a direct path to start a new draw.

### 4.4 Adjust the bin after selection

At any time after a bin exists (not just right after drawing), the user can, for any bin stick:

- **Replace it**, choosing either:
  - **Random**: the system randomly draws a replacement from the pool's sticks that are not already in the bin.
  - **Pick one**: the system shows a list of the pool's sticks not currently in the bin, and the user taps the one they want.
  - If every pool stick is already in the bin (no candidates available either way), the user is told no replacement is available and the stick is left unchanged.
- **Remove it**, dropping it from the bin without any replacement. It stays untouched in the pool.

Additionally, the user can **add a new stick to the bin** without replacing or removing anything else — see §4.4a.

### 4.4a Add a stick to the bin (grow beyond the original draw)

At any time after a bin exists, the user can deliberately add one more stick to it, on top of whatever it already contains:

- This is a bin-level action (it doesn't target an existing bin entry the way Replace/Remove do), offered from the Home screen alongside — but separate from — the per-stick Replace/Remove actions.
- The system shows the same kind of candidate list used by Replace's Pick-one mode: the pool's sticks not currently in the bin (i.e. not already active or done this week). The user taps the one they want, and it's appended to the bin's active sticks.
- Unlike the initial weekly draw, this operation is **not capped at 5** — the bin is allowed to exceed 5 active sticks once the user has deliberately grown it. The 5-stick cap applies only to the random draw described in §4.2.
- If every pool stick is already in the bin (no candidates available), the user is told so and the bin is left unchanged — the same failure mode as Replace in §4.4.

### 4.5 Manage multiple pools

- The user can create additional named pools (e.g. "Breakfast," "Lunch"). Pool names must be unique (case-insensitive) across all pools.
- The user can rename or delete any pool, including the default "Dinner" pool (subject to the always-at-least-one-pool rule in §3).
- Each pool has entirely independent sticks and its own weekly bin; actions in one pool never affect another.
- The user can switch which pool is currently active/displayed on the main screen.

### 4.6 Import and export the meal library

Since the app is deliberately single-device with no sync (§7), the user can move their meal ideas between separate instances (e.g. phone and desktop) by hand, via a JSON file:

- **Export** produces a single JSON file containing every pool and every stick within it (names only — no ids, timestamps, or weekly bin state, since bins are transient weekly data that doesn't make sense to carry between instances). This is a non-destructive, immediate action requiring no confirmation.
- **Import** reads a JSON file the user selects and **replaces** the current instance's entire meal library with its contents: all existing pools and sticks are removed and replaced by what's in the file, and — because sticks are being wholesale replaced — any existing weekly bin (on any pool) is cleared as part of the same operation rather than left referencing sticks that may no longer exist.
  - Because this discards existing data, it requires an explicit confirmation step before applying, naming the consequence (this replaces all current pools and meal ideas on this device, and cannot be undone).
  - The file is validated before anything is applied: a malformed file, or one with zero pools, is rejected with a clear error and nothing changes. There is no partial import.
  - After a successful import, the first pool in the file becomes the active pool.
  - The existing name-uniqueness rules (§3) still apply to the imported data — a file containing duplicate pool names, or duplicate stick names within one pool, is rejected as invalid.

---

## 5. Screens & Interaction Behavior

Navigation is a simple forward/back stack — no deep linking is required. All screens operate on one pool at a time: the "active pool."

### Home (main screen)

- Shows the active pool's name (also acts as the entry point to the Pool Switcher).
- Shows the active pool's current bin: a list of its active (not-done) sticks, or an empty-state prompt ("No meals planned this week" + a direct action to start a draw) if there are none.
- Provides: a one-tap random pick among the currently shown sticks (highlights one, doesn't persist anything); tapping a specific stick to select it manually; an action to start a new weekly draw (only relevant/shown once a bin has content); an action to open pool management (add/edit/delete meal ideas); a bin-level "Add a meal to this week's plan" action (per §4.4a) offered whenever the pool has at least one stick not already in the bin.
- Selecting a stick (random or manual) surfaces a "Done" action for that stick.
- Per-stick, secondary actions (e.g. via long-press or an overflow menu): **Replace** (offers Random or Pick-one, per §4.4) and **Remove** (with a confirmation step, since it's a destructive-feeling action, even though the idea survives in the pool).

### Weekly Draw

- On entry, if the pool has zero sticks, the screen doesn't proceed — it returns the user to pool management instead.
- If a bin already exists for this pool, asks for confirmation before proceeding (see §4.2).
- Immediately draws up to 5 sticks and displays them for review — no manual "start" tap needed once the screen opens.
- If the pool has fewer than 5 sticks, shows a notice with the actual count available.
- Each drawn stick has a "Discard" control (draws a replacement immediately, if one remains).
- A "Confirm" action (available once there's at least one drawn stick) saves the set as the new bin and returns to Home.
- Backing out / cancelling discards the whole session and returns to Home with the previous bin untouched.

### Pool (Meal Idea) Management

- Lists all sticks in the active pool (sorted alphabetically), or an empty-state message ("No meal ideas yet — add one") if there are none.
- An "add" action opens the stick editor (§ below) to create a new stick.
- Selecting an existing stick offers **Edit** (opens the stick editor pre-filled) and **Delete** (with a confirmation step, naming the stick).
- Provides **Export** (immediate, no confirmation) and **Import** (file picker → validation → confirmation step naming the destructive consequence → apply) actions for the whole meal library, per §4.6.

### Pool Switcher

- Lists every pool, with the active one visually marked.
- Selecting a pool makes it active and returns to Home.
- An "add pool" action opens a small inline form (name entry) to create a new pool; duplicate names are rejected inline; success makes the new pool active.

### Stick Editor (shared pattern, not a standalone screen)

A small form (used identically for both Add and Edit) with a single name field. Validates: non-empty (rejects blank/whitespace-only names inline) and no duplicate within the pool (inline error, save blocked until resolved).

---

## 6. Business Rules & Algorithms

These are the exact mechanics that must be reproduced precisely, since subtle deviations would change how the app feels:

1. **Random draw**: uniform random selection _without replacement_ from the pool's current stick list, capped at 5 draws (or fewer if the pool has fewer sticks).
2. **Discard → redraw**: discarding a drawn stick permanently excludes it from the rest of that session (it can never come back up in that same draw) and immediately triggers one more draw from whatever's left, if anything is left.
3. **Replace (post-confirmation)**: "Random" mode draws uniformly from pool sticks _currently absent from the bin_; "Pick one" mode lets the user choose directly from that same candidate list.
4. **Mark done**: always results in the stick being in the done list and out of the active list — regardless of its prior state (idempotent).
5. **Stale references**: a bin may reference a stick that no longer exists in its pool (because it was deleted while still in the bin). Such references are simply excluded when displaying the bin's contents; they are not proactively cleaned up, and they're never eligible for future draws or replacements.
6. **Name uniqueness scopes**: pool names are unique **globally** (case-insensitive); stick names are unique **per pool** (case-insensitive) — the same stick name is allowed to exist independently in two different pools.
7. **Last-pool safeguard**: deleting a pool that is the only one remaining creates a fresh empty "Dinner" pool as part of the same operation, so the app is never left with zero pools.
8. **Add to bin**: candidates are the pool's sticks not currently in the bin (active or done) — the same candidate set Replace's Pick-one mode uses. Adding appends the chosen stick to the bin's active sticks; the resulting bin is not subject to the 5-stick cap, since that cap applies only to the initial random draw (§4.2), not to bins the user has deliberately edited.
9. **Import replace**: importing a library file is all-or-nothing — the file is fully validated (shape, at least one pool, no duplicate names) before anything is applied; on success, every existing pool, stick, and weekly bin in the instance is replaced/cleared in a single operation; on failure, nothing changes and the previous library is left exactly as it was.

---

## 7. Persistence & Offline Behavior

- All pool, stick, and bin data must persist locally across sessions with no account, login, or network connection required at any point.
- Changes should be reflected immediately everywhere they're displayed (e.g. adding a stick to a pool should be visible in any open list of that pool without a manual refresh).
- The in-progress **Selection Session** (draw-in-review state) is deliberately **not** persisted. This is intentional: if the app is closed or crashes mid-draw, nothing is lost except the unconfirmed draw itself — the previously confirmed bin is guaranteed to be untouched.
- There is no multi-device sync and no cloud backup of any kind — this is a single-device, local-only app.

---

## 8. Accessibility Requirements

Target: WCAG 2.1 AA.

- **Contrast**: all text/icon-against-background pairs must meet ≥4.5:1 for normal text and ≥3:1 for large text or standalone icons.
- **Touch targets**: every interactive control must have a minimum hit area of 48×48 (device-independent units).
- **Screen reader support**: every interactive element — including icon-only controls — must expose a meaningful accessible name/label, not just a visual icon. Representative labels to preserve:
  | Element                | Accessible label                                                              |
  | ---------------------- | ----------------------------------------------------------------------------- |
  | Random pick action     | "Pick a random meal from this week's plan"                                    |
  | Stick list item (pool) | "{name}, meal idea"                                                           |
  | Bin stick item         | "{name}" plus a state hint: "in this week's plan" or "done"                   |
  | Done action            | "Mark {name} as done and remove from this week's plan"                        |
  | Discard action (draw)  | "Discard {name} and draw a replacement"                                       |
  | Active pool indicator  | "Active pool: {name}. Tap to switch."                                         |
  | Add-to-bin action      | "Add a meal to this week's plan"                                              |
  | Export action          | "Export meal library as a file"                                               |
  | Import action          | "Import meal library from a file — replaces all current pools and meal ideas" |
- **State never conveyed by color alone**: e.g. a highlighted/selected stick must be distinguishable via more than background color (also via a text/label state change).
- **Confirmation before destructive actions**: deleting a stick, deleting a pool, removing a bin stick, and importing a library file (which replaces the entire local meal library) must all require an explicit confirmation step before executing.
- **Keyboard/focus navigation**: all interactive elements must be reachable and operable via keyboard/focus traversal alone, in a logical (visual top-to-bottom, left-to-right) order.

---

## 9. Performance Expectations

Stated as user-perceived targets, not implementation techniques:

- The app should feel ready to use in well under a second from a cold start.
- All interactions (navigation, list scrolling, selections) should feel smooth and immediate — no visible stutter.
- Reading or writing data must never freeze the interface; if anything takes a perceptible amount of time, the interface should show a loading indicator rather than appearing frozen or blank.
- These targets hold at the app's expected scale: a single user, a modest number of pools (order of tens), and a modest number of sticks per pool (order of hundreds total) — this is not a data-processing app and never needs to handle large datasets.

---

## 10. Explicit Non-Goals

Carried forward unchanged from the original app — a rebuild should not silently add scope beyond this document:

- No multi-device sync or cloud backend of any kind.
- No user accounts, login, or authentication.
- No notifications, reminders, or time/calendar-based scheduling — "weekly" is a purely user-initiated cadence, not an automated trigger.
- No configurable draw size — the draw is always up to 5 sticks.
- No deep linking / URL-addressable app states.

---

## 11. PWA-Enabled Opportunities (non-normative)

These are **not** requirements and are not part of feature parity — they're natural capabilities a PWA offers that the original app's spec never had reason to consider, worth a design note for the new environment's owner to decide on later:

- **Installability**: offering to add the app to the home screen / app list, since the app's whole premise (open it, glance at the bin, close it) suits a lightweight installed-app presence.
- **Offline-availability indicator**: since the app is offline-first, a subtle indicator confirming "you're fully functional offline" could reduce any user uncertainty that a purely local-storage app can be prone to on the web (as opposed to native mobile, where offline-by-default is more assumed).
- **Responsive layout**: unlike the original mobile-only app, a PWA is likely to be opened on wider screens (tablet, desktop); the design should degrade gracefully rather than assuming a phone-sized viewport.
- **Notifications**: a possible future enhancement (e.g. a gentle nudge to start the week's draw) — explicitly out of scope for parity, but flagged since it was never ruled out in the original spec so much as never possible on the platform it was written for.

---

## 12. Success Criteria

Carried forward from the original spec, reframed generically:

- Adding a new meal idea takes under 30 seconds from any point in the app.
- A full weekly draw (draw → optional discards → confirm) completes in under 60 seconds for a typical 5-stick session.
- Picking tonight's meal from the bin takes under 10 seconds from a cold app open.
- All meal ideas and the current weekly bin survive an app/browser restart with 100% fidelity — zero data loss, across every pool.
- A second pool can be created, populated, and drawn from without any interference with an existing pool's data or bin.
- A first-time user can complete the full flow — add ideas, draw the week, pick tonight's meal — without needing external instructions.
