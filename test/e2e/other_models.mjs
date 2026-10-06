// Computed fields on the other customizable models (seeded in test/e2e/seed.rb):
// project, user, version, time entry, group and enumeration (time entry activity).
// Each is computed when the object is saved through its own form.
import { e2e } from '../../.codex/e2e/lib.mjs';

const P = 'e2e-project';
const t = await e2e('other_models');
const expect = (ok, what) => { if (!ok) t.problems.push(what); };

async function cfIds() {
  const auth = 'Basic ' + Buffer.from(`admin:${process.env.RMP_ADMIN_PASSWORD || 'Redmine7Test!'}`).toString('base64');
  const r = await t.page.request.get(`${t.BASE}/custom_fields.json`, { headers: { Authorization: auth } });
  return Object.fromEntries((await r.json()).custom_fields.map(c => [c.name, c.id]));
}
const text = async sel => ((await t.page.locator(sel).first().textContent().catch(() => '')) || '').trim();

// project: saved by a manager in the project settings
await t.login('manager');
const cf = await cfIds().catch(() => ({}));
await t.go(`/projects/${P}/settings`);
await t.page.click('#edit_project input[name=commit], form.edit_project input[type=submit]');
await t.settle();
t.check('save project');
await t.go(`/projects/${P}`);
const code = await text('.cf_' + cf['E2E project code'] + ' .value, li.cf_' + cf['E2E project code']);
expect(/E2E-PROJECT-\d+/.test(code), `project: E2E project code is "${code}"`);
await t.shot('project', `Project saved by the manager: "E2E project code" = ${code}`);

// version: created by the manager
const vname = `E2E v${Date.now() % 100000}`;
await t.go(`/projects/${P}/versions/new`);
await t.page.fill('#version_name', vname);
expect(await t.page.locator(`#version_custom_field_values_${cf['E2E name length']}`).count() === 1, 'version form: the computed field is an input (not read-only, as before)');
await t.page.click('#new_version input[name=commit], form#new_version input[type=submit]');
await t.settle();
t.check('create version');
await t.go(`/projects/${P}/roadmap`);
const vlen = ((await t.page.locator('li', { hasText: 'E2E name length' }).last().textContent().catch(() => '')) || '').trim();
expect(vlen === `E2E name length: ${vname.length}`, `version: "${vlen}", expected E2E name length: ${vname.length}`);
await t.shot('version', `Version "${vname}" created by the manager: "E2E name length" = ${vname.length}`);

// time entry: logged by the manager, typed value ignored
await t.go(`/projects/${P}/time_entries/new`);
await t.page.fill('#time_entry_hours', '1.25');
await t.page.selectOption('#time_entry_activity_id', { index: 1 }).catch(() => {});
await t.page.fill('#time_entry_comments', 'E2E computed minutes');
const minutesInput = t.page.locator(`#time_entry_custom_field_values_${cf['E2E minutes']}`);
if (await minutesInput.count()) await minutesInput.fill('999');
await t.page.click('#new_time_entry input[name=commit], form#new_time_entry input[type=submit]');
await t.settle();
t.check('log time');
await t.go(`/projects/${P}/time_entries?set_filter=1&f[]=comments&op[comments]=~&v[comments][]=E2E+computed+minutes&c[]=spent_on&c[]=hours&c[]=comments&c[]=cf_${cf['E2E minutes']}&sort=id:desc`);
const minutes = await text(`table.time-entries tr.time-entry td.cf_${cf['E2E minutes']}`);
expect(minutes === '75', `time entry: E2E minutes is "${minutes}", expected 75 (999 was typed)`);
await t.shot('time-entry', 'Time entry of 1.25 h logged by the manager with 999 typed in "E2E minutes": the formula overrides it with 75', { full: false });

// user: the reporter saves their own account
await t.login('reporter');
await t.go('/my/account');
await t.page.click('#my_account_form input[name=commit], form#my_account_form input[type=submit]');
await t.settle();
t.check('save my account');
await t.shot('my-account', 'The reporter saves their own account; the computed user field is shown as an input (not read-only outside issues, as before)');

await t.login('admin');
const users = await t.page.request.get(`${t.BASE}/users.json?name=reporter`, {
  headers: { Authorization: 'Basic ' + Buffer.from(`admin:${process.env.RMP_ADMIN_PASSWORD || 'Redmine7Test!'}`).toString('base64') } });
const reporterId = (await users.json()).users[0].id;
await t.go(`/users/${reporterId}`);
const display = await text(`li.cf_${cf['E2E display name']}, .cf_${cf['E2E display name']}`);
expect(display.includes('E2E, Reporter'), `user: E2E display name is "${display}"`);
await t.shot('user', 'User profile: "E2E display name" = "E2E, Reporter", computed when the reporter saved the account');

// group: saved by the admin
await t.go('/groups');
await t.page.locator('a', { hasText: 'E2E group' }).first().click();
await t.settle();
await t.page.click('form.edit_group input[type=submit], #tab-content-general input[type=submit]');
await t.sudo();
await t.settle();
t.check('save group');
await t.go('/groups');
await t.page.locator('a', { hasText: 'E2E group' }).first().click();
await t.settle();
const slug = await t.page.inputValue(`#group_custom_field_values_${cf['E2E group slug']}`).catch(() => '');
expect(slug === 'e2e-group', `group: E2E group slug is "${slug}"`);
await t.shot('group', `Group saved by the admin: "E2E group slug" = ${slug}`);

// enumeration: a time entry activity saved by the admin
await t.go('/enumerations');
await t.page.locator('table.list a', { hasText: 'Design' }).first().click();
await t.settle();
await t.page.click('#enumeration-form input[type=submit], form input[name=commit]');
await t.settle();
t.check('save activity');
await t.go('/enumerations');
await t.page.locator('table.list a', { hasText: 'Design' }).first().click();
await t.settle();
const acode = await t.page.inputValue(`#enumeration_custom_field_values_${cf['E2E activity code']}`).catch(() => '');
expect(acode === 'DESIGN', `activity: E2E activity code is "${acode}"`);
await t.shot('activity', `Time entry activity "Design" saved by the admin: "E2E activity code" = ${acode}`);

await t.done();
