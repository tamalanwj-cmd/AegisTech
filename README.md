# TSPES — Tabletop Scenario Exercise System

A tabletop-exercise platform with two portals:

- **Administrator portal** — scenarios, courses, marking, reports, users, groups.
- **Participant portal** — enrolled courses, timed injects, submissions and a
  summary of the exercise.

The data lives in a self-hosted **NocoDB** instance; the UI is React 19
(Create React App) with React Router 7 and plain per-page CSS.

---

## 1. Run it

```powershell
# 1. database (Docker required)
cd nocodb-server
docker compose up -d          # http://localhost:8080

# 2. app
cd ..\tspes-dashboard
npm install
npm run setup:nocodb          # create/migrate tables + seed the first admin
npm start                     # http://localhost:3000
```

`.env.local` holds the NocoDB URL, base id and API token. The seeded
administrator is `admin` / `admin123` (override with `ADMIN_USERNAME`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`) — change the password after signing in.

Production build: `npm run build`, then serve `build/` (a `Dockerfile` and
`nginx.conf` are included).

### Re-running the schema setup

`npm run setup:nocodb` is idempotent. Besides creating missing tables it also
adds columns that were introduced later (`scenarios.objectives`,
`injects.rubric`), so an existing installation can be upgraded by running it
again — no data is touched.

---

## 2. Data model

Hierarchy: **crisis category → scenario → course**.

| Table | Purpose | Key columns |
|---|---|---|
| `users` | accounts and roles | `username`, `email`, `password_hash`, `salt`, `role`, `status` |
| `categories` | crisis types (built-ins + custom) | `name` |
| `scenarios` | the tabletop itself | `name`, `description`, `objectives`, `crisis_type`, `course_id`, `status` |
| `injects` | ordered prompts inside a scenario | `scenario_id`, `title`, `description`, `information`, `sequence`, `assigned_role`, `rubric` |
| `courses` | a scenario scheduled for participants | `name`, `scenario_id`, `group_id`, `enrolments` (JSON `{userId, role}`), `status` |
| `groups` | reusable sets of participants | `name`, `members` (JSON ids) |
| `responses` | answers + marks | `user_id`, `course_id`, `scenario_id`, `inject_id`, `answer`, `submitted_at`, `time_spent_seconds`, `marks`, `feedback`, `marked_by`, `marked_at` |

`responses` is keyed by (participant, inject): the participant portal writes the
answer and time taken, the marking workspace writes the mark and feedback to the
same row.

Roles: `admin`, `participant`, `observer`. (The unused `facilitator` role was
removed; marking is an administrator task.)

---

## 3. What this revision changes

See **[DESIGN_CHANGES.md](DESIGN_CHANGES.md)** for the item-by-item mapping of
the design change document. In short:

- Dashboard, Reports and the new **Marking** pages read live data from NocoDB.
- Administrators mark inject answers, with rubric, time taken and feedback.
- Scenarios can create a crisis category and a course inline.
- Participants get a per-inject count-up timer and answers are persisted.
- Navigation was re-grouped, Settings removed, and the layout works on
  tablet/mobile.

---

## 4. Scripts

| Command | What it does |
|---|---|
| `npm start` | development server on port 3000 |
| `npm run build` | production bundle in `build/` |
| `npm run setup:nocodb` | create/migrate NocoDB tables, seed first admin |
| `npm test` | Jest tests (`src/**/*.test.js`) |

---

## 5. Notes / limitations

- Authentication is client-side: the NocoDB token is inlined into the bundle, so
  this build is meant for a trusted network or a local demo, not the public
  internet. Password hashing (PBKDF2-SHA256, 100k iterations) is real, but the
  session itself is a browser-stored token.
- There is no mail service; password reset codes are shown on screen.
- Participant drafts live in `localStorage`; submitted answers are persisted to
  NocoDB when the `responses` table exists, and the UI says so when it does not.
