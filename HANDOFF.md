# HANDOFF — kora-events platform (2026-11-24)

Purpose: let any future maintainer recover and continue this project without
the original author. Read this first, then README.md.

## What this is

Static site on GitHub Pages: https://kora-events-research.github.io/kora-events/
Repo (public, MIT): https://github.com/kora-events-research/kora-events
Owner identity: GitHub account `kora-events-research` (credentials held by the
project owner outside this repo).

Scope: open, anonymous, bilingual (AR/EN) football match-event analytics for
research/education. No odds, no betting signals, no staking, no monetary framing.
Light theme, Cairo font, minimal UI. Premier League (E0) 2026/27 only.

## Data sources and permissions (current, verified)

- Football-Data.co.uk: results + match events CSV (E0.csv season file) and
  fixtures.csv for upcoming fixtures. Only source as of 2026-11-24.
  We publish aggregates and fixture facts, never raw per-match rows.
- ESPN public scoreboard: RETRIEVAL STOPPED 2026-11-24 (commit f6ce485).
  Disney Terms of Use (https://disneytermsofuse.com/english/ — espn.com's own
  site links to this URL as its terms of use; the ToU page expressly covers
  ESPN-branded products), prohibited-uses clause x: no accessing/copying/
  extracting via robot/script/automated means, including building datasets.
  `ESPN_ENABLED = False` in src/export_site.py. Do not re-enable without a
  licensed basis. Never read odds/pickcenter fields from any source.
- Known gap: FD fixtures.csv is posted later in the week (typically Friday PM
  for the weekend round, Tuesday PM for midweek). Bridged 2026-11-24 by an
  openfootball provisional schedule layer (CC0, github.com/openfootball/england):
  30 fixtures Nov 28–Dec 5, each card badged "provisional — date/time
  unconfirmed (openfootball)"; pairings verified 20/20 vs the official PL list,
  dates/times can be stale ±1–2 days and are never shown as confirmed.

## Full-season schedule list (added 2026-11-24 ~05:15)

- src/build_schedule.py parses the openfootball 2026-27 file into
  data/schedule.json: all 330 unplayed fixtures (rounds 6-38, 10 per round,
  330 + 50 played = 380 asserted). UI: separate lazy-loaded <details>
  (sched-block) with round selector, date + time + pairing only, all dates/
  times labeled provisional, NO analysis cards or probabilities (browsing scope only,
  without multiplying identical league-rate cards).
- Workflow rebuilds archive + schedule on every cron run.

## football-data.org (signed up 2026-11-24 ~04:55)

- Account: Kora Events Research, FREE tier (12 competitions incl.
  Premier League — verified on /coverage, fixtures/results/tables, 10 calls/min,
  delayed scores). Email verified same day (account stays active).
- API token: held by the project owner outside this repo.
  NEVER in the repo (public, MIT — GTC §6.1 forbids keys in open-source repos),
  never in messages/logs/artifacts. Workflow reads it from the Actions secret
  FOOTBALL_DATA_ORG_TOKEN (secret creation pending the account holder's
  authorization as of 2026-11-24).
- GTC (read firsthand 2026-11-24, last updated 2018-06-01): §2.3 one
  application/domain; §6.1 credentials confidential, never in open-source
  repos; §7.1 exact attribution "Football data provided by the
  Football-Data.org API" (now in the site footer, both languages); §9.1 no
  display of their data after cancellation; §9.2 no crests/logos. NOTE: the
  GTC has no explicit affirmative public-display grant; display during an
  active subscription is inferred from the mandatory in-app attribution plus
  the post-cancellation display ban. If the subscription ever ends, remove the
  layer AND its displayed data immediately (§9.1).
- Layer design (src/export_site.py): upgrades openfootball provisional
  pairings to confirmed date/time (utcDate) only; fail-loud team mapping;
  any fetch error leaves provisional badges untouched.
- PUBLICATION HELD 2026-11-24 (FDORG_ENABLED = False): confirmed dates are
  provider-derived per-fixture data, and the exporter commits snapshot.json
  to a PUBLIC repo — permanent, non-revocable git history. The GTC has no
  affirmative scope for that. Do not re-enable until a revocable serving
  path exists (e.g. Pages artifact deployment without committing provider
  data to git) plus executable removal-on-cancel behavior. The fallback
  workflow run (45309482315, no token) proved the inert path.
- Retention/cache terms: the GTC contains none beyond §9.1 (removal after
  cancellation) and §4.6 (account data deletion on cancellation).
- Attribution footer carries the exact §7.1 string + "(integration pending —
  no data from them displayed yet)"; it must switch to plain attribution
  only after the first successful provider-data run actually displays data.
- Scope decision (2026-11-24): broadening schedule browsing to the full
  permitted season is in scope, but the schedule list
  must be separated from event-rate analysis cards (no multiplying identical
  league-rate cards), keeping clear that numbers are league references.

## Architecture

- src/build_db.py → football_research.db (SQLite, not published raw)
- src/features.py, src/experiment.py → team state, logistic model, time-split
  evaluation vs running-average baseline (train on first ~71, test on last 38)
- src/export_site.py → data/snapshot.json + forecast log update + evaluation
- index.html + assets/app.js → static client rendering snapshot.json
- .github/workflows/update.yml → cron Fri/Tue 17:30 UTC, Sun/Wed 23:00 UTC;
  runs export, commits data/ if changed; manual workflow_dispatch works.

## Results archive (data/archive.json, added 2026-11-24)

- src/build_archive.py parses openfootball/england season files (CC0, public
  domain) into data/archive.json: 2023-24, 2024-25, 2025-26 complete (380/380
  each) + 2026-27 partial (50 played). UI: lazy-loaded <details> with
  season/round selectors, FT + HT scores, home-first reading legend (AR/EN),
  per-row aria labels, partial-coverage label on the current season.
- Public per-match history comes ONLY from openfootball (CC0).
  Football-Data.co.uk per-match rows are never published in any format
  (match-level raw redistribution is disallowed); FD appears only as derived
  aggregates and fixture facts.
- Fidelity verification 2026-11-24: all 3 complete seasons cross-checked
  380/380 each against FD E0.csv; current-season 50/50. Structural checks:
  38 rounds x 10 matches per season, 20 distinct teams, no duplicates,
  valid dates, home != away.
- Parser note: the 'v' half-time format must be tried before other formats.

## Forecast log semantics (data/forecast_log.json)

- Key: (date, home, away). First recorded pre-kickoff forecast for a key is
  never overwritten by reruns (`if key not in log`); each entry stores model
  version + data cutoff. This is append-only application behavior — NOT a
  tamper-proof guarantee (git history itself is owner-mutable).
- Reschedule handling: a rescheduled match gets a new key (new date) and a new
  forecast; the old entry stays pending forever and never joins a result.
  That is intentional (immutability) but means stale pending entries
  accumulate; a future cleanup may mark them "void — rescheduled" without
  altering their stored probabilities.
- Evaluation joins results by the same key once FD results include the match.
- 20 entries recorded 2026-11-23 from the (now discontinued) ESPN supplement
  for matches 27 Nov–3 Dec; they remain immutable and evaluable when FD posts
  results. The 21st displayed fixture was 1 segregated retrospective entry
  used to demonstrate the evaluation path (not a live forecast).
- Publication-time evidence: forecast_at is self-reported and alone does
  not prove public pre-kickoff publication. Evidence must come from the git
  commit history of data/forecast_log.json, checked against the actual
  kickoff at evaluation time (owner-mutable; record the commit SHAs relied
  on).
- Repository history note: this clean history begins 2026-11-24. Earlier
  development history is retained privately by the project owner. The v1
  forecast entries were published in commits
  eaf72dc3d225a565b8714fff702bcc07bdbf06c9 (2026-11-23 22:27 UTC) and
  2981a0abaf2c3f1b9005e035ad2921f974d82400 (2026-11-23 22:32 UTC), both
  before every frozen entry's kickoff; the project owner can verify these
  on request.

## Outstanding work (priority order)

1. REAL prospective evaluation: after 27 Nov matches, FD results let the log
   evaluate the 20 stored v1 forecasts. This is the project's core deliverable.
   Needs: cron results ingestion (Sun/Wed 23:00 UTC runs) + honest report.
   Note the v1 entries were recorded by the discontinued logreg model; v2
   entries (league base rates) start accruing once FD posts confirmed fixtures.
2. Model improvement work: the single-fit logistic model was found WORSE than
   its own expanding baseline on all 5 events in an independent multi-season
   validation (1,634 held-out matches, 13 seasons, season-block bootstrap) on
   2026-11-24. Display therefore switched to v2-baseline (league rates labeled
   as general reference). A blend was only suggestive (CIs cross zero) and was
   NOT adopted. Any future model change ships as a new labeled version,
   prospectively, after passing the same evaluation harness.
3. Schedule breadth: openfootball provisional layer covers Nov 28–Dec 5 with
   per-card "provisional" badges; football-data.org free tier (one app/domain,
   attribution required, key server-side only) is an approved-pending upgrade
   path once its GTC is read firsthand; defer until needed.
4. Archive expansion: only EPL seasons are included (3 complete + current
   partial). openfootball covers other leagues/countries under the same CC0
   terms if breadth is wanted; update cadence is manual rebuild for now.

## Operational notes

- Auth + favorites are LIVE (Supabase free tier, project
  fbcwfizcmdulrkahypwi): email/password signup without email confirmation,
  star/unstar persistence verified E2E 2026-11-24 including password recovery
  (explicit redirectTo client-side; GoTrue emails otherwise carry the domain
  root, which 404s). Test users are created and deleted within each test;
  credentials are generated per test and never recorded.
- GitHub deployment: fine-grained PAT creation hit a provider throttle
  2026-11-24 ~04:04 ("You can't perform that action at this time") after 17
  same-day create/delete cycles. PAT pushes are HELD until an external signal says the restriction
  lifted; no timer-based retries. Verified alternative in use: ordinary web-UI file upload
  (/upload/main/<dir>) on the existing browser session — used for the
  v2-baseline deploy (3 commits, remote verified byte-identical via raw fetch).
- 2026-11-24 PM: Pages migrated to GitHub Actions artifact deployment
  (workflow run 45314169243, update.yml assemble-site -> upload-pages-artifact
  retention-days:1 -> deploy-pages). Live serving verified byte-identical to
  repo via no-store probes. Rollback: Pages settings -> Deploy from a branch
  (branch keeps the full working site). Commit route: the multi-file upload
  widget mangles filenames and 400s — use the web EDIT flow
  (/edit/main/<path>) + dialog commit; verify via contents API raw fetch
  (Accept: application/vnd.github.raw). Any pre-migration local clone may have diverged from origin. Treat
  remote main as truth and re-clone before local rebuilds.
- EVALUATION 2026-11-27/28: first anchor fixture is
  Nottingham Forest vs Chelsea, Fri Nov 27 20:00 GMT per the PL amendments
  page (premierleague.com/en/news/4725574). The frozen v1 entry exists in
  data/forecast_log.json with kickoff 20:00 UTC and forecast_at Nov 23 22:31
  UTC. At evaluation: recheck actual kickoff + authoritative final result
  (fd.org API if enabled by then, else a permitted open source), score ONLY
  the frozen v1 entries and only events whose result source is permitted; if
  result ingestion lags, preserve the blocker, never backfill synthetic or
  retrospective results. The kickoff, source and publication checks above
  are REQUIRED RESEARCH at evaluation time before any public claim of
  genuine prospective accuracy; none is automated or already satisfied. An evaluation checkpoint is planned for Nov 28.
- EVALUATION INTEGRITY REQUIREMENT (2026-11-24): automatic result matching alone
  does not prove prospective evaluation. Before scoring an entry, verify
  (a) forecast_at precedes the ACTUAL kickoff (official source), (b) exact
  season/date/home/away match between frozen entry and result row, and
  (c) event definitions from the same permitted source as training. Any
  conflict (kickoff moved, name mismatch, timing doubt, source gap)
  quarantines the entry: report it as conflicted, exclude it from scoring,
  and never count it as forecast success or error.
- Never display 100%/0% (use >99%/<1%); no certainty wording; joint tester
  numbers are descriptive historical co-occurrence with Wilson CIs, never
  multiplied marginals, never model joint forecasts.
- Fixture times are labeled source time, timezone unspecified (openfootball
  states none; verified 2026-11-24, no UK claim). Provisional openfootball
  rows are date-only in the pipeline: no assumed-timezone kickoff conversion,
  kickoff_utc/london/passed all null; cards show the provisional badge.
  Provider-confirmed UTC timestamps (fd.org) replace this per fixture once the
  integration is enabled and verified.
- Team-name mapping between sources must be verified programmatically.
