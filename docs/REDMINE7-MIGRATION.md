# Redmine 7 migration: redmine_plugin_computed_custom_field

Start a Claude Code (or Codex) session on this repository, branch `redmine70-migration`, with:

> Read CLAUDE.md and docs/REDMINE7-MIGRATION.md, then carry out the Redmine 7 migration of this
> plugin as described there, on branch redmine70-migration. That includes the plugin's tests on
> PostgreSQL and MariaDB, every function exercised end to end on a real running Redmine in a
> browser (with and without permissions, failure paths included) with screenshots you looked at,
> and an OpenAI review of the diff when OPENAI_API_KEY is set. Report to me in Dutch at the end.

This file is the plan and the memory of that work. Update it as you go: verdicts, results,
what is left. Written 2026-10-06 from a measured analysis (report at the bottom).

## Status

| | |
|---|---|
| Plugin id | `computed_custom_field` |
| GEOxyz runs today | `master` |
| Upstream | yimanishi/redmine_plugin_computed_custom_field (master @ c9cb1df, 2024-07-18; keten annikoff (archived) -> dpalic -> yimanishi) |
| Runs on Redmine 7 as is | DEELS (invalid formulas saved silently, see analysis) |
| Runs on Redmine 7 with this branch | JA: tests green on PostgreSQL and MariaDB, every function verified in a browser |
| Upstream sync | UPSTREAM DOOD |
| After sync | n.v.t. |
| Complexity (1 trivial .. 5 rewrite) | 2 |
| Measured on | Redmine 7.0-stable-GEOxyz @ 8067e23, Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16.15, MariaDB 10.11.14; Redmine 5.1-stable on Ruby 3.2.6 |
| Migration session | 2026-10-06, done, including Jan's answers to the open questions; see "Results" |
| 5.1 compatible | yes: the same branch is green on Redmine 5.1 (24 runs, 0 failures); behaviour changes decided by Jan are listed in "After the upgrade" |

## Already on this branch

| commit | what |
|---|---|
| 70c3a41 | `patch_models` also includes `CustomFieldPatch` and `IssuePatch`, so dev/test behave like production (eager load); test `test_patch_custom_field_and_issue` |
| bdbf13f | `record.errors.add(:formula, ...)` instead of `errors[:formula] <<`: invalid formulas are refused again; tests `test_invalid_formula`, `test_formula_with_syntax_error_is_invalid` |
| 396dfb1 | tests: `update_attributes` -> `update` (removed in Rails 6.1, failed on 5.1 too) |
| 245a2f2 | the validator's `eval` gets the file name `(eval)`: on Ruby 3.3 a syntax error otherwise showed the server path (`eval at /.../formula_validator.rb:33`); asserted in `test_formula_with_syntax_error_is_invalid` |
| 1c06111, a74ba7d | computed fields are shown as text, not as an input, on every form (project, user, my account, registration, version, time entry, group, enumeration incl. project activities, document); issues unchanged. Decided by Jan. Tests `CustomFieldsHelperPatchTest` |
| 68944da | `Document` added to `patch_models`: computed document fields are computed. Decided by Jan. Test `test_document_computation` |
| 4afb67a, see below | formulas are evaluated again after the insert (`after_create`), so `id`, `created_on` etc. are known on creation. Test `test_id_is_known_on_create` |
| (after 4afb67a) | a formula that only fails once the id exists keeps its value from before the insert (as on 5.1), logs a warning, and the next save shows the error. 4afb67a rolled back instead, but in an outer transaction (project/issue copy, import) that rollback is lost: `save` returned nil while the row stayed (proved with rails runner). Test `test_error_after_create_keeps_the_value_from_before_the_insert` (inside an outer transaction) |
| 674d2ad | `rake redmine:computed_custom_field:check_formulas [SAMPLE=20]`: checks every stored formula (form validation + the last objects of its type), saves nothing, exit 1 on a failure. Test `FormulaCheckTest` |
| 46b3285, 771686a, f2e72c8 | e2e scenarios `test/e2e/*.mjs`, seed `test/e2e/seed.rb`, screenshots in `docs/e2e/`, `docs/e2e/before/` (5.1), `docs/e2e/r7-unfixed/` (the bug) |

No schema change, no new gem, no new setting, no new string (locales unchanged). New: one rake task.

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Priority items**

1. DONE (bdbf13f). Commit the fix from the analysis: `record.errors.add(:formula, e.message)` in lib/computed_custom_field/formula_validator.rb (invalid formulas are saved silently on Rails 7+).
2. DONE (70c3a41, 396dfb1). Fix the tests (update_attributes) and load the patches the same way in dev/test as in production.

**Open items from the analysis** (Dutch; where they conflict with a decision or a priority item above, those win)

3. DONE = item 1.
4. Productie-formules auditen: tool gebouwd (674d2ad, `rake redmine:computed_custom_field:check_formulas`), uitvoeren op productiedata is een stap van de upgrade (zie "After the upgrade"). Getest op de e2e-server: alle 15 formules ok (exit 0); met `start_date.to_s(:db)` in "E2E hours x1.5" geschreven buiten de validatie: `FAIL #5 ... wrong number of arguments (given 1, expected 0)`, met Issue #8 en #7 als voorbeelden, exit 1.
5. DONE = item 2.

**Checks**

6. DONE. Tests: see "Results". 7.0-stable-GEOxyz PostgreSQL and MariaDB, and 5.1-stable: 24 runs, 0 failures, 0 errors (numbers in "Results").
7. DONE. Webhooks: the plugin changes no issue data outside the normal save; computed values are stored as ordinary custom values before the save, so the core payload (`issues/show.api.rsb`, rendered as the webhook owner) carries them. Verified: webhook created by `manager` on issue.updated, E2E base 6 -> 30, payload `{"id":2,"name":"E2E double","value":"60"}` (test/e2e/api_and_webhook.mjs). Nothing to change.
8. DONE. Every function by hand in a browser: see "Inventory of functions".

## Results

Baseline (before any change, branch = master code, 7.0-stable-GEOxyz):
- PostgreSQL: 15 runs, 25 assertions, 2 failures, 3 errors. MariaDB: 15 runs, 25 assertions, 2 failures, 3 errors. 5.1-stable (Ruby 3.2.6, PostgreSQL): identical, 2 failures, 3 errors (test rot, not an R7 regression).
- e2e baseline (generic smoke + core flows): smoke 10 shots 0 problems, core 6 shots 0 problems.

After this branch:
- Plugin tests at the final head: PostgreSQL 24 runs, 65 assertions, 0 failures, 0 errors; MariaDB 24 runs, 65 assertions, 0 failures, 0 errors; 5.1-stable (PostgreSQL, Ruby 3.2.6) 24 runs, 64 assertions, 0 failures, 0 errors. Together with custom_field_sql and redmine_depending_custom_fields (both `redmine70-migration`): 24 runs, 65 assertions, 0 failures. (First round, before Jan's answers: 17 runs, 42 assertions, 0 failures on all of them.)
- `rails zeitwerk:check`: "All is good!". Production server (eager load) boots.
- Migrations down to 0 and up again: OK on PostgreSQL and MariaDB (columns `formula`, `is_computed` removed and restored; ConvertCustomFields has no down, it is a data migration that is a no-op on the way down).
- e2e on PostgreSQL (`./.codex/e2e.sh`, production mode, fresh database): smoke 10, core 6, plugin scenarios 6 files / 44 shots, 0 problems. On MariaDB (`start_server.sh --reset`): same counts, 0 problems (screenshots looked at, not committed: identical to PostgreSQL). Together with custom_field_sql + redmine_depending_custom_fields: same counts, 0 problems.
- The e2e run found one regression of the read-only change before it was committed as done: the project settings page (activities tab) gave a 500, because `show_value` calls `customized.visible?` and enumerations have none; fixed in a74ba7d with a test.
- Before (`docs/e2e/before/`, master code on Redmine 5.1): formula_validation, formula_form, issue_computation, runtime_error, other_models, 35 shots, 0 problems: the branch on 7 behaves as master on 5.1.
- The bug (`docs/e2e/r7-unfixed/`, master code on Redmine 7): formula_validation 7 problems (all four invalid formulas saved, `1 / 0` stored on "E2E double"), after which every issue save is refused.
- Cross-plugin (rails runner, rolled back): a computed string field over a `depending_list` field gives `BETA` for `Beta`; a computed `progressbar` field (format new in Redmine 7) gives 40 for 4 h. OK.

## Inventory of functions

| function | how a user reaches it | scenario | screenshots (docs/e2e/) |
|---|---|---|---|
| "Computed", "Formula", "Available custom fields" on the custom field form, every custom field type | Administration > Custom fields > New (hook `view_custom_fields_form_upper_box`) | formula_form.mjs | formula_form-new-unticked, -new-filled, -new-project-field, -new-empty-list |
| Double-click inserts `cfs[id]`; section survives a format change (XHR re-render) | same | formula_form.mjs | formula_form-new-filled |
| Create a computed field | same, Create | formula_form.mjs | formula_form-created |
| "Computed" locked after creation (also against a crafted request); plain saved fields cannot become computed | Custom field > Edit | formula_form.mjs | formula_form-edit-computed, -still-computed, -edit-plain |
| Formula validation on create and edit (division by zero, syntax error, removed Rails API, unknown field) | Custom field form | formula_validation.mjs | formula_validation-create-*, -edit-refused, -edit-kept |
| Admin only (manager, reporter: 403) | /custom_fields/new | formula_form.mjs | formula_form-refused-manager, -refused-reporter |
| Computation on issues for int, bool, list, float, date, user, link, string | New / edit issue | issue_computation.mjs | issue_computation-created, -updated |
| Computed issue fields read-only (new, edit, bulk edit) | Issue forms, bulk edit | issue_computation.mjs | issue_computation-new-form, -bulk-edit |
| Computed values as issue list column | Issues, options | issue_computation.mjs | issue_computation-list-column |
| As Reporter (no extra permissions) and outsider | issue view, new issue, private project | issue_computation.mjs | issue_computation-as-reporter, -created-by-reporter, -outsider-refused |
| Runtime formula error blocks the save with the message (form and REST) | New / edit issue, POST /issues.json | runtime_error.mjs | runtime_error-create-refused, -edit-refused, -edit-not-stored, -nothing-stored |
| Computation on Project, Version, TimeEntry, User, Group, Enumeration (activity), Document | their own forms | other_models.mjs | other_models-project, -version, -time-entry, -user, -document |
| Computed fields shown as text, not as input, on every form; a forged value is ignored | project settings, version, log time, my account, group, activity, new document | other_models.mjs | other_models-project-form, -time-entry, -my-account, -group, -activity, -document-form |
| `id` known on creation (computed again after the insert) | new issue, new document | issue_computation.mjs, other_models.mjs | issue_computation-created, other_models-document |
| A formula failing only after the insert: created with the earlier value, next save refused | new issue, edit | runtime_error.mjs | runtime_error-create-late, -late-next-save-refused |
| Formula check of stored formulas | `rake redmine:computed_custom_field:check_formulas` | command line on the e2e server | output quoted in work item 4 |
| REST API: computed value cannot be forged, values returned; private issue 403 for outsider | POST/PUT/GET /issues.json | api_and_webhook.mjs | api_and_webhook-api-issue (results in the console output, quoted in "Results") |
| Webhooks (Redmine 7) carry the computed values | /webhooks | api_and_webhook.mjs | api_and_webhook-webhook-form, -webhook-created, -webhook-issue |
| Migrations (3), incl. the old `computed` format conversion | `rake redmine:plugins:migrate` | command line | down/up, see "Results" |

The plugin has no routes, permissions, project module, settings, mail, macros or cron (one rake task, above): the smoke run lists 0 plugin GET routes, which is correct.

## Findings (pre-existing, same on 5.1)

Fixed after Jan's answers:
- `id` (and `created_on`) were nil on creation, a link built from the id stayed without it until the next save, which then journaled the change: fixed in 4afb67a.
- Computed fields were read-only only on issues; on the other forms a typed value was overwritten: fixed in 1c06111 / a74ba7d (shown as text).
- Computed document fields were never computed: fixed in 68944da.
- A formula stored before the upgrade is not re-validated: the rake task (674d2ad) finds the broken ones.

Not fixed, by design:
- Formulas are arbitrary Ruby run with `eval`; anyone who can manage custom fields (admin) can run code on the server. That is what the plugin is; only admins reach the form (verified: manager and reporter get 403).

## Kit notes (the .codex scripts, not changed here)

- `redmine_clone.sh` rsyncs the whole plugin root into `plugins/<id>`, excluding only its own `REDMINE_DIR`: a second checkout inside the plugin root (`redmine51`) gets copied into every other one and fills the disk (13 GB here). Keep extra checkouts outside the plugin root (`REDMINE_DIR=/home/user/rm51`).

- `test_setup.sh` with provisioning as root: `$SUDO -u postgres psql` expands to `-u postgres psql` when `SUDO` is empty ("-u: command not found"). Worked around with `su postgres -c` and `RMP_PROVISION_DB=0`.
- `start_server.sh` piped into `grep` never returns (the server keeps the pipe open); run it with output to a file.
- Redmine 5.1 needs Ruby < 3.3: `PATH=/opt/rbenv/versions/3.2.6/bin:$PATH REDMINE_DIR=redmine51`.
- After switching database.yml between adapters, re-run `test_setup.sh` (the Gemfile.lock follows the adapter).

## Review

- Own adversarial review of the whole diff: no findings (the `eval` keeps the same binding and locals; the include guards are idempotent with eager loading; everything also runs on 5.1).
- OpenAI review (`./.codex/openai_review.sh`, gpt-5, range f89e8ec..f29d8de, 16 files): "No findings", docs/reviews/openai-2026-10-06-f29d8de.md.

## Open questions for Jan

None left. Answered 2026-10-06:
1. Read-only computed fields outside issues: yes, built (1c06111, a74ba7d).
2. Compute document fields: yes, built (68944da). Check before the upgrade whether production has computed document fields (`SELECT id, name FROM custom_fields WHERE is_computed AND type = 'DocumentCustomField'`): they start computing after the upgrade.
3. Formula audit: explained; replaced by the rake task (674d2ad), see "After the upgrade".

## GEOxyz changes to review or re-apply

None: this branch carries no GEOxyz commits of its own (upstream code only).

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- No migration of its own to run (schema unchanged); `rake redmine:plugins:migrate` is a no-op for this plugin.
- Check the stored formulas ON REDMINE 7 (on 5.1 the old APIs still work, so the check finds nothing there): on a test copy of production upgraded to 7, or right after the upgrade, before users work:
  `RAILS_ENV=production bundle exec rake redmine:computed_custom_field:check_formulas`
  It saves nothing, prints `ok` or `FAIL` per computed field with the error and up to 5 failing objects, and exits 1 when one fails. Fix a FAIL in Administration > Custom fields (the form refuses an invalid formula with the reason; typical fixes: `to_s(:db)` -> `to_fs(:db)`, `update_attributes` -> `update`, `Fixnum` -> `Integer`, `BigDecimal.new(x)` -> `BigDecimal(x)`, `File.exists?` -> `File.exist?`, `URI.escape` -> `CGI.escape`/`ERB::Util.url_encode`). `SAMPLE=100` checks more objects per field.
  A broken formula otherwise makes every save of the matching objects fail with "Error while formula computing in field ...".
- Changes users notice: a formula that fails only once the id exists no longer blocks creation (it keeps the value from before the insert, a warning `computed_custom_field: <Class> #<id>: ...` goes to the log, the next save shows the error); computed fields are shown as text (not as an input) on project, user, version, time entry, group, enumeration and document forms; computed document fields start computing; formulas using `id`/`created_on` have them on creation.
- Before the upgrade, list computed document fields (open question 2): they start computing after the upgrade, and a failing one would block saving documents (the rake task covers them too).
- Webhooks: nothing to configure for this plugin; payloads carry the computed values.

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
./.codex/test_plugin.sh                                # minitest + rspec of this plugin
```

```sh
./.codex/start_server.sh       # real Redmine (production mode) with this plugin, seeded users and projects
./.codex/e2e.sh                # browser: smoke over the plugin's pages, core issue flows, test/e2e/*.mjs
./.codex/openai_review.sh      # independent OpenAI review of the diff, only when OPENAI_API_KEY is set
```
Write one scenario per function in `test/e2e/<function>.mjs` (example at the top of
`.codex/e2e/lib.mjs`); screenshots and a table per scenario land in `docs/e2e/`. Users:
`admin`, `manager` (every permission), `reporter` (no plugin permissions), `outsider` (no
membership); password `Redmine7Test!`. Needs Node with Playwright and Chromium
(`npm install -g playwright && npx playwright install --with-deps chromium`).

On GitHub the same runs by hand only: Actions > "Redmine tests (manual)" > Run workflow (tick
"e2e" for the browser run; screenshots come back as an artifact).

The coordinator's harness (`plugin-check.sh` in the migration kit, kept outside this repo) adds a
browser smoke test of every page the plugin adds and runs all GEOxyz plugins together; the
results quoted in the analysis come from it.

## How the migration session works (same for every plugin)

1. **Start**: `git fetch && git checkout redmine70-migration && git pull`. Read this whole file,
   including the analysis report at the bottom. Do not reopen decisions recorded here.
2. **Baseline, before you change anything**:
   - the plugin's tests on Redmine 7.0-stable-GEOxyz with PostgreSQL and with MariaDB;
   - a real running Redmine with this plugin (`./.codex/start_server.sh`) and the browser run
     (`./.codex/e2e.sh`: smoke over every page the plugin adds, plus the core issue flows).
   Write the numbers here. Something already broken now is a finding, not your regression.
3. **Inventory of functions**: list every function of the plugin in this file, in a table
   "function | how a user reaches it | scenario | screenshot". Take them from the README,
   `init.rb` (permissions, menus, settings, project modules), routes, hooks and view
   overrides, macros, mail handling, API endpoints, rake tasks and cron jobs. This table is the
   coverage list for step 8; a function that is not in it will not be tested.
4. **GEOxyz changes**: go through the table above, one item at a time. Each kept or re-made change
   is its own commit with a test that proves it. Record the verdict in the table.
5. **Work list**: then the numbered list, in order. One concern per commit.
6. **Portability**: everything must run on Redmine's supported databases (PostgreSQL,
   MySQL/MariaDB; SQLite where the plugin already supports it). Migrations must be reversible and
   are run down and up on PostgreSQL and MariaDB.
7. **Together**: run with the other GEOxyz plugins installed (the migration kit's harness, or
   `RMP_EXTRA_PLUGINS`). A failure that only appears in combination is a finding to record here.
8. **End to end, visually, every function**: on the real Redmine from `start_server.sh`
   (production mode, the way GEOxyz runs it), write one scenario per function in
   `test/e2e/<function>.mjs` with `.codex/e2e/lib.mjs` and run them with `./.codex/e2e.sh`.
   - Each function as the users that matter: `admin`, `manager` (every permission, the
     plugin's included), `reporter` (member without the plugin's permissions), `outsider`
     (no membership, private project must stay invisible).
   - The failure paths too: setting off, permission absent, empty state, invalid input, the
     value that used to raise. A refusal that is shown is evidence as much as a success.
   - One screenshot per function and per path, with a caption saying what it proves. Open
     every screenshot and look at it: a picture nobody looked at proves nothing. Commit them
     in `docs/e2e/` and list them in the inventory table.
   - Functions without a page (mail in and out, REST API, rake tasks, cron, webhooks): exercise
     them against the same running instance (mails land in `redmine/tmp/mails`, `t.mails()`
     reads them; API through `t.page.request`) and record command and result.
   - Before pictures where behaviour or layout changes: the branch GEOxyz runs today, on
     Redmine 5.1, same scenarios, `RMP_E2E_OUT=docs/e2e/before`.
   - Run the whole e2e set once on MariaDB as well (`RMP_DB=mariadb`, then `start_server.sh --reset`).
9. **Independent review**: first your own, adversarial: re-read the whole diff as if someone
   else wrote it and you are paid to reject it. Then, **when `OPENAI_API_KEY` is set in the
   session**, `./.codex/openai_review.sh`: it sends the diff of this branch to an OpenAI model
   and writes `docs/reviews/openai-<date>-<sha>.md`. Every finding gets a `Resolution:` line
   there (fixed in <commit>, with a test, or why not). Fix, re-run the tests and the e2e set,
   and run the review again until it has nothing new that you accept. Without the key: write
   "OpenAI review: skipped, no OPENAI_API_KEY" in the report; never send code anywhere else.
10. **After the upgrade**: anything the production upgrade must do for this plugin (data fixes,
    settings, cron, files, removed features) goes into the section "After the upgrade".
11. **Finish**: update "Status", the inventory and the work list in this file, push
    `redmine70-migration`, and report: what changed, test numbers on both databases, e2e
    numbers (scenarios, screenshots, problems), the review result, what is left, what needs Jan.

### Stop and ask Jan when
- a GEOxyz change would be lost or behave differently for users;
- a new gem, a new setting with user impact, or a schema change not required by Redmine 7 seems needed;
- the change would send data to an external service (the OpenAI review of the code diff is the
  one exception Jan approved, and only when the key is present);
- upstream and GEOxyz disagree on behaviour and both are defensible.

## Rules

- **Target**: Redmine 7.0-stable-GEOxyz (https://github.com/jcatrysse/redmine), Rails 8.1, Ruby 3.3+.
  Core sources for comparison: branches `5.1-stable`, `6.1-stable`, `7.0-stable`, `7.0-stable-GEOxyz`.
- **Evidence**: never report a test, lint, browser check or review as passed without having seen
  it. Quote the summary lines; list the screenshots. "Should work" is not a result, and a green
  test suite is not proof that a feature works in the browser.
- **Tests**: never skip, delete or weaken a test. A test that encodes Redmine 5 markup or
  behaviour is updated to Redmine 7, with the reason in the commit. Every fix gets a test that
  fails without it.
- **Minimal diffs** in the plugin's own style. No reformatting, no unrelated refactoring.
  Something wrong elsewhere: write it down here, do not fix it in passing.
- **Security**: authorization on every action and entry point; `safe_attributes`, never
  `to_unsafe_hash` into `update`; no SQL built from params; no secrets in logs; no `html_safe` on
  user input.
- **Webhooks (new in Redmine 7)**: core sends issue payloads (core `issues/show.api.rsb`, rendered
  as the webhook owner) to webhook endpoints, past plugin hooks and controller patches. If the
  plugin hides, adds or changes issue data, make webhooks consistent with that or record why not.
- **Redmine 7 conventions**: SVG icons through `sprite_icon` (the `icon icon-*` CSS is gone),
  Propshaft assets under `assets/` (`/assets/plugin_assets/<id>/...`), the new header and user menu,
  `ContextMenus::*Controller`, Loofah-based text formatting, Chart.js as an ES module, sudo mode
  (on by default: `t.sudo()` in a scenario). The breaker list is in the migration kit's CHECKLIST.md.
- **Locales**: keep the locales the plugin ships in sync; translate a new key by matching the
  closest existing key in the same file, not from scratch; do not add new languages.
- **5.1 compatibility**: prefer fixes that also run on Redmine 5.1 so they can be merged early;
  say so when a fix cannot.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why). Push after every
  commit, together with the updated status in this file: a cloud session can stop at a usage
  limit, and work that is not pushed is lost with its container.
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL and MariaDB
  (numbers in this file); boot, production-like eager load, migrations up/down OK.
- Every function in the inventory exercised end to end on a real running Redmine, with and
  without permissions and on its failure paths; `./.codex/e2e.sh` green; screenshots looked at,
  committed in `docs/e2e/` and listed.
- Review done: your own, and the OpenAI review when the key is present, every finding resolved
  in `docs/reviews/`.
- No new failure when run together with the other GEOxyz plugins.
- "After the upgrade" lists every action production needs; "Status" is current.


## Analysis report (2026-10-06, Dutch)

# redmine_plugin_computed_custom_field
- Gebruikte branch: master @ c9cb1df (2024-07-18) - plugin id computed_custom_field, versie 1.0.7
- Upstream: keten annikoff/redmine_plugin_computed_custom_field (gearchiveerd 2021-04-13) -> dpalic (master ecf1d5d, 2024-04-23, "Computed Custom Field NextGen", redmine.org: compatibel 4.0.x/3.4.x) -> yimanishi (master c9cb1df, 2024-07-18) -> jcatrysse. GitHub toont jcatrysse als fork van yimanishi.
- Fork t.o.v. upstream: 0 eigen commits, 0 upstream-commits ontbreken (GEOxyz master = yimanishi master)
- Andere relevante branches: alleen master (upstream ook `ruby-1.8.7`). Fork ecanuto (fa14f31, 2022-06) heeft 1 inhoudelijke commit ("dont make computed cfs readonly on issue form") - niet relevant voor R7. Geen fork met Redmine 6/7-ondersteuning gevonden (WebSearch, redmine.org).
- Migraties: 3 (formula, is_computed, convert). Tests: minitest test/unit (3 bestanden), test/ui (overgeslagen door de harness). Geen Gemfile (PluginGemfile leeg/oud).

## 1. Werkt out of the box op Redmine 7?   DEELS
Harness `redmine_plugin_computed_custom_field@origin/master` (1006-084900-s2; ROLLBACK-run 1006-091244-s2):
- OK bundle, boot (1.0.7), eager load, plugin migrations dev+test, rollback naar 0 en terug
- FAIL minitest: 15 runs, 25 assertions, 2 failures, 3 errors
  - 3 errors: `update_attributes` in test/unit/model_patch_test.rb:17,21,44,79 en custom_field_test.rb:36 - verwijderd in Rails 6.1, dus faalden ook al op 5.1 (test-rot, geen R7-regressie).
  - 2 failures (custom_field_test.rb:18 test_invalid_formula, :34 test_computed_custom_field_callbacks): `CustomFieldPatch` wordt in de test-omgeving niet geladen. init.rb laadt `custom_field_patch`/`issue_patch`/`model_patch` niet expliciet meer (c27a498 "Changed require lines as they cause problems in production"); de patches worden alleen actief via Zeitwerk eager load (productie). Zelfde gedrag op 5.1.
- OK smoke: 60/60 zonder serverfout.
- Init.rb `PLUGIN_MIGRATION_CLASS = ActiveRecord::Migration["8.1".to_f]` -> `Migration[8.1]`, bestaat in Rails 8.1: werkt (migraties en rollback OK). Bij een Rails `x.10` zou `to_f` fout gaan, nu irrelevant.

Runtime-check onder eager load (zoals productie), slot dev-DB:
- STIL KAPOT: formule `1/0` en een formule met syntaxfout worden als geldig opgeslagen (`valid? => true`, geen fouten). Oorzaak: lib/computed_custom_field/formula_validator.rb:9 `record.errors[:formula] << e.message`; sinds Rails 7 geeft `errors[:x]` een kopie, `<<` doet niets (los geverifieerd op ActiveModel 8.1.3.1). Op 5.1 (Rails 6.1) werkte het via een deprecation-shim.
- OK: geldige formule `(id || 0) * 2` op een int-veld rekent bij opslaan correct (issue #1 -> "2"); IssuePatch maakt het veld read-only.

## 2. Upstream sync?   UPSTREAM DOOD
Niets nieuwers in de hele forkketen; geen Redmine 6/7-lijn.

## 3. Werkt na sync op Redmine 7?   n.v.t.

## 4. Complexiteit en blokkers   score 2
- Blokkers: lib/computed_custom_field/formula_validator.rb:9 - foutmeldingen gaan verloren - `record.errors.add(:formula, e.message)`. Fix niet gecommit (commit in de repo geweigerd door de permissie-classifier), wel getest door hem in de slot-kopie toe te passen:
  ```diff
  --- a/lib/computed_custom_field/formula_validator.rb
  +++ b/lib/computed_custom_field/formula_validator.rb
  @@ -6,7 +6,7 @@ module ComputedCustomField
         define_validate_record_method(object)
         object.validate_record record
       rescue Exception => e
  -      record.errors[:formula] << e.message
  +      record.errors.add(:formula, e.message)
       end
  ```
  Na de fix: `1/0` -> ongeldig "Formula divided by 0"; syntaxfout -> ongeldig; geldige formule ongewijzigd. Optioneel tweede commit voor de tests: `update_attributes(` -> `update(` op de 5 plaatsen hierboven (test-API, geen verzwakking). Met beide wijzigingen en eager load: 15 runs, 34 assertions, 0 failures, 0 errors; zonder eager load blijven de 2 failures (patch niet geladen in test-env, pre-existing). Smoke met fix: 60/60.
- Stille breuken / aandachtspunten voor formules (Ruby-code in de DB, `eval` in de context van het object): op Ruby 3.3 / Rails 8.1 werken niet meer: `to_s(:db)`/`to_s(:short)`/`to_s(:delimited)` op Date/Time/getallen (ArgumentError -> `to_fs`), `update_attributes`, `errors[:x] <<`, `Fixnum`/`Bignum`, `BigDecimal.new`, `File.exists?`, `URI.escape`, `=~` op Integer, hash als laatste positioneel argument naar keyword-methodes. Elke fout geeft bij het opslaan van het object "Error while formula computing" en blokkeert de save. Audit: `SELECT id, name, field_format, formula FROM custom_fields WHERE is_computed = true;` en grep op die patronen. Float-velden: core 7.0 normaliseert float-waarden (`normalize_float`) bij het zetten - nieuw, niet afzonderlijk getest.
- Dev/test vs productie: zonder eager load zijn `CustomFieldPatch` (validatie, safe_attributes `is_computed`/`formula`) en `IssuePatch` (read-only) niet actief - in development kan het formulier de formule dus niet opslaan. Pre-existing (sinds c27a498), identiek op 5.1.
- Security (pre-existing): formules zijn willekeurige Ruby die met `eval` draait; wie custom fields mag beheren (admin) heeft code-executie.
- Overlap met Redmine 7 core: geen (core heeft geen berekende velden; 7.0 heeft alleen een progressbar-format en default-date-offsets).
- Pairwise (statisch): `before_validation :eval_computed_fields` op Issue/Project/User/TimeEntry/Version/Group/Enumeration; `Issue#read_only_attribute_names` alias. Naast de formats van custom_field_sql en redmine_depending_custom_fields geen naamconflicten; berekende velden die naar een `sql`/`depending_*`-veld verwijzen (`cfs[id]`) krijgen `cast_value` van dat format - niet getest.
- Open werk voor ansif:
  - formula_validator.rb:9 fixen (diff hierboven) en committen op `redmine70-migration` (basis origin/master c9cb1df).
  - Alle productie-formules auditen op de genoemde Ruby/Rails-API's.
  - Optioneel: patches expliciet laden in `after_initialize` zodat dev/test = productie, en de tests (`update_attributes`) herstellen.

## Branch redmine70-migration
- Lokaal aangemaakt op origin/master @ c9cb1df maar zonder commits: de commit van de fix werd door de permissie-classifier geweigerd ("Modify Shared Resources"); de repo staat op die branch (inhoud = origin/master).
- Eindresultaat zonder fix (harness, ROLLBACK=1): OK boot/eager/migrations/rollback, minitest 15 runs 2 failures 3 errors.
- Met fix (slot): smoke 60/60, minitest met eager load 15 runs 0 failures.
- Rollback migraties: OK

