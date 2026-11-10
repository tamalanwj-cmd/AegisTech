# Design change document — implementation notes

This file maps every point of `Design change document.docx` (v0.2) to what was
implemented. File paths are relative to `tspes-dashboard/`.

---

## 1. Stuff not working

| # | Item | What was done |
|---|---|---|
| 1 | Quick actions menu not working | Every action is now a real link: **Create New Exercise** → `/admin/courses?new=1` (opens the create dialog), **Build Scenario** → `/admin/scenarios?new=1`, **Mark Answers** → `/admin/marking`, **Manage Users/Groups**, **View Reports**. `src/pages/Dashboard/index.js` |
| 2 | Recent activity not working | Built from real records: participant submissions (with relative time), newly scheduled exercises and newly created scenarios. `src/services/overview.js` → `activity` |
| 3 | Exercise overview does not reflect the actual scenarios/courses | The hard-coded `exerciseData` array is gone. Rows come from `courses` joined with `scenarios`, `groups`, `injects` and `responses`; completion = answered ÷ (participants × injects). |
| 4 | Reports page does not reflect scenarios; allow going straight to exercises; remove graphs if needed | Both placeholder charts were removed. The page is now a live table (exercise, scenario, category, group, participants, responses, completion, status) where the exercise name and a **Mark →** action open the marking workspace, and the scenario name opens its builder. There is also an **Open marking** button, CSV export and print. `src/pages/Reports/*` |

## 2. Stuff to add

| # | Item | What was done |
|---|---|---|
| 5 | Marking injects page for admins | New **Marking** section: `/admin/marking` lists exercises grouped/filterable by crisis category; `/admin/marking/:courseId` is the marking workspace with participant tabs, inject selector, rubric panel, the participant's answer, the time taken, marks (0–100), comments and Save. `src/pages/Marking/*` |

## 3. Stuff to change

| # | Item | What was done |
|---|---|---|
| 6 | Creating scenarios should let admins create a category, in the pop-up | **+ Category** button in the Scenarios header opens a small dialog, and the scenario dialog has a **+ New category** toggle that swaps the dropdown for a text field. Custom categories persist in the `categories` table and appear as filter tabs everywhere. |
| 7 | Similarly, option to create a course in the pop-up | The scenario dialog has a **+ New course** toggle. The course is created with the new scenario already linked, so the participant flow works immediately. |
| 8 | Hierarchy crisis → scenario → course | `scenarios.crisis_type` + `scenarios.course_id`, and `courses.scenario_id`. Saving a scenario now calls `linkScenarioToCourse()`, which points the chosen course at the scenario and unlinks any other course that used to run it. A category with no scenarios and a scenario with no course are both valid states. |
| 9 | Inject creation/edit | Already in the Scenario Builder and kept; the inject form gained a **Marking Rubric** field that the marking workspace displays. |
| 10 | Menu/filter layout overflows a small window | Filter tabs wrap onto a new line (`flex: 1 1 320px; flex-wrap: wrap`), the tables scroll horizontally instead of clipping, and the page grids collapse at 1100/1000/900/768/480 px. |
| 11 | Facilitator role redundant; admin marks injects | `facilitator` removed from `ROLES`; legacy rows fall back to `participant`. Marking is admin-only. |
| 12 | Admin can view a course, sort by category, click into a menu | Marking index: category tabs + search, sorted by category then course name, each row opens the marking workspace. |
| 13 | UI follows the current TSPES theme | New pages reuse the existing palette (`#0f172a` sidebar, `#1d4ed8` primary, `#f1f5f9` canvas), the shared `Modal`, `ConfirmDialog` and `.btn-*` classes; only element placement follows the sketches. |
| 14 | Opens a menu for marking | `/admin/marking/:courseId` — `src/pages/Marking/Workspace.js` |
| 15 | Courses higher in the menu bar, above Reports, below Scenarios | Sidebar order is now Dashboard → Scenarios → Courses → Marking → Reports → Users → Groups. |
| 16 | Settings menu slightly redundant — remove | Sidebar item, route, breadcrumb entry and the page itself were removed. |
| 17 | Remove graph on dashboard | The "Activity Trend" card was deleted; the dashboard keeps stat cards, exercise overview, quick actions and activity. |

## 4. Optional design changes

| # | Item | What was done |
|---|---|---|
| 18 | Hyper-linked navigation back to the main menu | Breadcrumbs are links (Administrator Portal → section → page); the TSPES mark is a home button in both portals; "View all"/"Mark →" links connect dashboard ↔ reports ↔ marking. |
| 19 | Accessibility / mobile + tablet | Responsive sidebar drawer with scrim + Escape to close, hamburger menu, wrapping toolbars, scrollable tables, visible keyboard focus ring, `prefers-reduced-motion` support, `aria-*` labels on tabs/menus. |

## 5. Participant menu section

| # | Item | What was done |
|---|---|---|
| 20 | Time taken with a count-up per inject, for rubrics | The exercise page shows a live `⏱ m min s sec` chip per inject. Time is accumulated into `session.timings`, written to `responses.time_spent_seconds` on submit, shown on the summary page and displayed to the marker ("Time taken: …"). |
| 21 | TSPES icon area as a back-to-dashboard button | Participant navbar brand is a link to `/participant`; administrator sidebar brand links to `/admin`. |
| 22 | Learning objectives cannot be edited, can be deleted from display | Objectives are now editable (one per line) in the scenario dialog, stored in `scenarios.objectives`, and the participant card is **not rendered at all** when a scenario has none — the empty placeholder from the screenshot is gone. |

---

## Data model changes

| Change | Why |
|---|---|
| new `categories` table | Custom crisis types created from the UI |
| new `responses` table | Persisted answers, time taken, marks and feedback (previously answers only lived in the participant's `localStorage`) |
| `scenarios.objectives` | Learning objectives |
| `injects.rubric` | Marking guide shown beside an answer |

Run `npm run setup:nocodb` to apply these to an existing database — the script
adds the two tables and the two columns without touching existing rows.

## Behaviour notes

- Participant answers are still saved locally first, so a missing/unreachable
  `responses` table never blocks an exercise; the UI shows a dismissible notice
  when the server write fails, and administrators see a banner explaining how to
  provision the table.
- Marks are stored per (participant, inject) and can be recorded even when the
  participant has not submitted an answer yet.
