# Thirty Days

A presentational tracker for a two-person, 30-day consistency challenge.

The page is a **view over a committed dataset**. It has no checkboxes and no write path.
You tick items in Todoist; a scheduled job reads yesterday's completions and commits them;
the page redraws.

```
Todoist  ──(scripts/sync.mjs, daily)──▶  public/data/state.json  ──(fetch)──▶  the view
   ▲                                              ▲
   │ you tick things here                         │ plan changes land here, by hand,
   │ (reminders, both phones)                     │ at a weekly reset
```

## Why it's shaped like this

The two kinds of write happen on completely different schedules. Ticks change daily and are
machine-written. The plan changes at setup and occasionally at a reset, and is human-written.
Separating them means the browser needs no credentials, no backend, and no auth — and a plan
you can only edit via a commit is a plan you won't quietly rewrite on a Wednesday because you
don't feel like doing the thing.

## Getting started

```bash
npm install
npm run dev
```

The view expects `public/data/state.json`. A worked example with a filled plan and a few days
of ticks is in `public/data/example.json` — copy it over `state.json` to see a populated view.

## Building the plan

The plan is built in the **single-file setup app** (`locked-in-30-v5.html`), which has the
nine-area sweep, the cadence sort, the slot editor and the load ceiling. When it's done, use
its *Download a backup* button, then:

```bash
npm run import-plan ~/Downloads/thirty-days-2026-09-01.json
```

That overwrites the plan and **preserves ticks and `syncedThrough`**, so re-importing an edited
plan mid-challenge doesn't wipe the history the sync has collected. It warns you about live
items with no time (Todoist won't remind you about those) and about breaching the daily ceiling.

## The daily sync

```bash
TODOIST_TOKEN_A=xxx TODOIST_TOKEN_B=yyy npm run sync
npm run sync -- --dry          # show what would change, write nothing
npm run sync -- --since=2026-09-10
```

Tokens come from Todoist → Settings → Integrations → Developer. They are read from the
environment by the script only and never reach the browser.

Matching works by `todoistId` when an item has one, falling back to a normalised title match
(case and punctuation insensitive). Unmatched and ambiguous completions are printed rather
than silently dropped — if two items share a title, give one of them a `todoistId` in the
dataset.

The sync is **additive**: it adds ticks and never removes one, because a missing completion is
far more likely to be an API hiccup than a genuine un-tick. Re-running it is safe and idempotent.
It sets `syncedThrough` to *yesterday*, since today is still in progress, and exits non-zero on
failure so a scheduler surfaces the problem instead of leaving the page quietly stale.

### Scheduling it

Any cron-shaped thing works. Two that need no server:

- **A GitHub Action** on a `schedule` trigger: checkout, `npm ci`, `npm run sync`, commit if
  `state.json` changed. Tokens go in repository secrets.
- **A Claude Code cloud task**, which runs remotely rather than depending on a laptop being
  awake. Give it the repo and the instruction to run the sync and commit the result.

Whichever you pick, the freshness line in the header is the check that it's still alive. It goes
amber after a day and red after two, and says the sync has probably stopped — believe it over
the grid.

## Deploying

It's a static build; there is no server.

```bash
npm run build      # → dist/
```

Point Cloudflare Pages, Netlify or GitHub Pages at the repo with build command `npm run build`
and output directory `dist`. `base: './'` in `vite.config.js` keeps asset paths relative, so a
GitHub Pages project subpath works without configuration.

Because `state.json` is fetched at runtime rather than imported at build time, a sync commit is
live as soon as it lands — no rebuild, and no window where a failed CI build leaves the page
showing last week.

### One thing to do before you put anything real in it

Static hosting means anyone with the URL can read the dataset. Tick data is harmless, but the
reality answers, the targets and "one thing I want more of from you" are not things to leave on
an unlisted public URL. Put the site behind Cloudflare Access with email one-time codes for
your two addresses — it's free at this scale and takes about five minutes.

## What's in the dataset

| Key | Written by | Notes |
|---|---|---|
| `start` | setup app | Day 1, `YYYY-MM-DD` |
| `syncedThrough` | sync | Drives the freshness line |
| `people.{a,b}.name` | setup app | Falls back to "Him" / "Her" |
| `reality` | setup app | Constraints: `a`, `a2`, `b`, `b2`, `us`, `us2` |
| `goals.{a,b}` | setup app | `one`, `done`, `derail`, `counter`, `reward` |
| `pact` | setup app | `rule`, `wantA`, `wantB` |
| `items[]` | setup app | `owner` a/b/both, `cadence`, `flex`, `time`, `todoistId` |
| `ticks` | sync | `d{day}\|{itemId}\|{owner}` → 1 |
| `days[n].together` | setup app | Draws the gold dot on the grid |
| `flex[week]` | setup app | Which day is that week's flex day |
| `resets[week]` | setup app | The four reset answers |

Days 29–30 are "week 5" and have no flex day, on purpose: finish clean.

## The rules the code actually enforces

- **A day is complete** when every one of that person's daily items is ticked — or it's the flex
  day and the item is flexible. Items with `flex: false` never get that pass.
- **The sun's height** is the share of days *both* of you completed, so it can't be moved by one
  person carrying the month.
- **Percentages** count partial days, so 4-of-5 isn't recorded as a zero.
- **Missed twice running** is surfaced at the top of the page while it's still actionable — the
  one thing a weekly grid structurally cannot do.
- **The daily ceiling is 5.** Over it, the plan panel says so.
