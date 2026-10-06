# Redmine 7 migration: redmine_plugin_computed_custom_field

Start a Claude Code (or Codex) session on this repository, branch `redmine70-migration`, with:

> Read CLAUDE.md and docs/REDMINE7-MIGRATION.md, then carry out the Redmine 7 migration of this
> plugin as described there, on branch redmine70-migration. Report to me in Dutch at the end.

This file is the plan and the memory of that work. Update it as you go: verdicts, results,
what is left. Written 2026-10-06 from a measured analysis (report at the bottom).

## Status

| | |
|---|---|
| Plugin id | `computed_custom_field` |
| GEOxyz runs today | `master` |
| Upstream | yimanishi/redmine_plugin_computed_custom_field (master @ c9cb1df, 2024-07-18; keten annikoff (archived) -> dpalic -> yimanishi) |
| Runs on Redmine 7 as is | DEELS |
| Upstream sync | UPSTREAM DOOD |
| After sync | n.v.t. |
| Complexity (1 trivial .. 5 rewrite) | 2 |
| Measured on | Redmine 7.0.1 (7.0-stable-GEOxyz + latest 7.0-stable), Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16 and MariaDB 10.11 |
| Branch head when this file was written | `c9cb1df` |

## Already on this branch

- nothing: the branch equals the branch GEOxyz runs today.

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Priority items**

1. Commit the fix from the analysis: `record.errors.add(:formula, e.message)` in lib/computed_custom_field/formula_validator.rb (invalid formulas are saved silently on Rails 7+).
2. Fix the tests (update_attributes) and load the patches the same way in dev/test as in production.

**Open items from the analysis** (Dutch; where they repeat a priority item, the priority item wins)

3. lib/computed_custom_field/formula_validator.rb:9 errors[:formula] << -> errors.add (getest in slot, niet gecommit: commit geweigerd door classifier)
4. Productie-formules auditen op to_s(:fmt), update_attributes, Fixnum, BigDecimal.new, File.exists?, URI.escape enz.
5. Optioneel: tests update_attributes -> update; patches ook buiten eager load laden

**Checks**

6. Run the plugin's whole test suite on Redmine 7.0-stable-GEOxyz with PostgreSQL AND MariaDB, and once on 5.1-stable if the branch is meant to stay 5.1-compatible.
7. Check Redmine 7 webhooks against this plugin (see "Rules"), and note the result here even if nothing is needed.
8. Verify every feature of the plugin by hand on a running Redmine 7 (screenshots).

## GEOxyz changes to review or re-apply

None: this branch carries no GEOxyz commits of its own (upstream code only).

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- Export the formulas (`SELECT id, name, field_format, formula FROM custom_fields WHERE is_computed`) and check them against Ruby 3.3 / Rails 8.1 (to_s(:db), update_attributes, errors[] <<, ...).

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
./.codex/test_plugin.sh                                # minitest + rspec of this plugin
```
On GitHub the same runs by hand only: Actions > "Redmine tests (manual)" > Run workflow.

The coordinator's harness (`plugin-check.sh` in the migration kit, kept outside this repo) adds a
browser smoke test of every page the plugin adds and runs all GEOxyz plugins together; the
results quoted in the analysis come from it.

## How the migration session works (same for every plugin)

1. **Start**: `git fetch && git checkout redmine70-migration && git pull`. Read this whole file,
   including the analysis report at the bottom. Do not reopen decisions recorded here.
2. **Baseline**: set up Redmine 7.0-stable-GEOxyz and run the plugin's tests on PostgreSQL and
   on MariaDB (see "How to test"). Write the numbers here before you change anything.
3. **GEOxyz changes**: go through the table above, one item at a time. Each kept or re-made change
   is its own commit with a test that proves it. Record the verdict in the table.
4. **Work list**: then the numbered list, in order. One concern per commit.
5. **Portability**: everything must run on Redmine's supported databases (PostgreSQL,
   MySQL/MariaDB; SQLite where the plugin already supports it). Migrations must be reversible and
   are run down and up on PostgreSQL and MariaDB.
6. **Browser**: start a Redmine 7 with this plugin, exercise every feature as admin and as a
   normal user with and without the plugin's permissions, and save screenshots (before on 5.1 or
   the old branch, after on 7.0) where behaviour or layout matters.
7. **Together**: run with the other GEOxyz plugins installed (the migration kit's harness, or
   `RMP_EXTRA_PLUGINS`). A failure that only appears in combination is a finding to record here.
8. **After the upgrade**: anything the production upgrade must do for this plugin (data fixes,
   settings, cron, files, removed features) goes into the section "After the upgrade".
9. **Finish**: update "Status" and the work list in this file, push `redmine70-migration`, and
   report: what changed, test numbers on both databases, what is left, what needs Jan.

### Stop and ask Jan when
- a GEOxyz change would be lost or behave differently for users;
- a new gem, a new setting with user impact, or a schema change not required by Redmine 7 seems needed;
- the change would send data to an external service;
- upstream and GEOxyz disagree on behaviour and both are defensible.

## Rules

- **Target**: Redmine 7.0-stable-GEOxyz (https://github.com/jcatrysse/redmine), Rails 8.1, Ruby 3.3+.
  Core sources for comparison: branches `5.1-stable`, `6.1-stable`, `7.0-stable`, `7.0-stable-GEOxyz`.
- **Evidence**: never report a test, lint or browser check as passed without having seen it.
  Quote the summary lines. "Should work" is not a result.
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
  `ContextMenus::*Controller`, Loofah-based text formatting, Chart.js as an ES module.
  The breaker list is in the migration kit's CHECKLIST.md.
- **Locales**: keep the locales the plugin ships in sync; translate a new key by matching the
  closest existing key in the same file, not from scratch; do not add new languages.
- **5.1 compatibility**: prefer fixes that also run on Redmine 5.1 so they can be merged early;
  say so when a fix cannot.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why).
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL and MariaDB
  (numbers in this file); boot, production-like eager load, migrations up/down OK.
- Every feature verified by hand on Redmine 7; screenshots listed.
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

