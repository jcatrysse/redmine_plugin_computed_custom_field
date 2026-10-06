// Computed fields on the other customizable models (seeded in test/e2e/seed.rb):
// project, user, version, time entry, group, enumeration (time entry activity)
// and document. Each is computed when the object is saved through its own form,
// where the computed field is shown as text, not as an input; a forged value is
// ignored, and a formula using the id has it on creation.
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
// a computed field in a form: its label and the value as text, no input
const readOnly = async (prefix, name) => {
  const p = t.page.locator('p', { has: t.page.locator('label', { hasText: name }) });
  expect(await t.page.locator(`#${prefix}_custom_field_values_${cf[name]}`).count() === 0, `${prefix} form: "${name}" is an input`);
  return ((await p.locator('.computed-value').first().textContent().catch(() => null)) ?? 'MISSING').trim();
};
let cf;

// project: saved by a manager in the project settings
await t.login('manager');
cf = await cfIds().catch(() => ({}));
await t.go(`/projects/${P}/settings`);
await readOnly('project', 'E2E project code');
await t.page.click('#edit_project input[name=commit], form.edit_project input[type=submit]');
await t.settle();
t.check('save project');
await t.go(`/projects/${P}/settings`);
const shown = await readOnly('project', 'E2E project code');
expect(/E2E-PROJECT-\d+/.test(shown), `project form: shows "${shown}" after saving`);
await t.shot('project-form', `Project settings as manager, after saving: "E2E project code" is shown as text (${shown}), no input`);
await t.go(`/projects/${P}`);
const code = await text('.cf_' + cf['E2E project code'] + ' .value, li.cf_' + cf['E2E project code']);
expect(/E2E-PROJECT-\d+/.test(code), `project: E2E project code is "${code}"`);
await t.shot('project', `Project saved by the manager: "E2E project code" = ${code}`);

// version: created by the manager
const vname = `E2E v${Date.now() % 100000}`;
await t.go(`/projects/${P}/versions/new`);
await t.page.fill('#version_name', vname);
await readOnly('version', 'E2E name length');
await t.page.click('#new_version input[name=commit], form#new_version input[type=submit]');
await t.settle();
t.check('create version');
await t.go(`/projects/${P}/roadmap`);
const vlen = ((await t.page.locator('li', { hasText: 'E2E name length' }).last().textContent().catch(() => '')) || '').trim();
expect(vlen === `E2E name length: ${vname.length}`, `version: "${vlen}", expected E2E name length: ${vname.length}`);
await t.shot('version', `Version "${vname}" created by the manager: "E2E name length" = ${vname.length}`);

// time entry: logged by the manager, a forged value ignored
await t.go(`/projects/${P}/time_entries/new`);
await readOnly('time_entry', 'E2E minutes');
await t.page.fill('#time_entry_hours', '1.25');
await t.page.selectOption('#time_entry_activity_id', { index: 1 }).catch(() => {});
await t.page.fill('#time_entry_comments', 'E2E computed minutes');
// a crafted request still sending a value for the computed field
await t.page.evaluate(id => {
  const i = document.createElement('input');
  i.type = 'hidden'; i.name = `time_entry[custom_field_values][${id}]`; i.value = '999';
  document.querySelector('#new_time_entry').appendChild(i);
}, cf['E2E minutes']);
await t.page.click('#new_time_entry input[name=commit], form#new_time_entry input[type=submit]');
await t.settle();
t.check('log time');
await t.go(`/projects/${P}/time_entries?set_filter=1&f[]=comments&op[comments]=~&v[comments][]=E2E+computed+minutes&c[]=spent_on&c[]=hours&c[]=comments&c[]=cf_${cf['E2E minutes']}&sort=id:desc`);
const minutes = await text(`table.time-entries tr.time-entry td.cf_${cf['E2E minutes']}`);
expect(minutes === '75', `time entry: E2E minutes is "${minutes}", expected 75 (999 was forged)`);
await t.shot('time-entry', 'Time entry of 1.25 h logged by the manager and a forged 999 for "E2E minutes": the formula stores 75; the form shows the field as text', { full: false });

// user: the reporter saves their own account
await t.login('reporter');
await t.go('/my/account');
await readOnly('user', 'E2E display name');
await t.page.click('#my_account_form input[name=commit], form#my_account_form input[type=submit]');
await t.settle();
t.check('save my account');
const mine = await readOnly('user', 'E2E display name');
expect(mine === 'E2E, Reporter', `my account: shows "${mine}" after saving`);
await t.shot('my-account', 'My account as the reporter, after saving: "E2E display name" = "E2E, Reporter" shown as text, not as an input');

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
const slug = await readOnly('group', 'E2E group slug');
expect(slug === 'e2e-group', `group: E2E group slug is "${slug}"`);
await t.shot('group', `Group saved by the admin: "E2E group slug" = ${slug}, shown as text in the form`);

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
const acode = await readOnly('enumeration', 'E2E activity code');
expect(acode === 'DESIGN', `activity: E2E activity code is "${acode}"`);
await t.shot('activity', `Time entry activity "Design" saved by the admin: "E2E activity code" = ${acode}, shown as text in the form`);

// document: created by the manager; the formula uses the id, known on creation
await t.login('manager');
await t.go(`/projects/${P}/documents/new`);
await readOnly('document', 'E2E document code');
const title = `E2E doc ${Date.now() % 100000}`;
await t.page.fill('#document_title', title);
await t.shot('document-form', 'New document as manager: "E2E document code" is shown as text, no input');
await t.page.click('#new_document input[type=submit], form#new_document input[name=commit]');
await t.settle();
t.check('create document');
await t.page.locator('a', { hasText: title }).first().click();
await t.settle();
const docId = new URL(t.page.url()).pathname.split('/').pop();
const dcode = await text(`li:has-text("E2E document code")`);
expect(dcode === `E2E document code: ${title.toUpperCase()}-${docId}`, `document: "${dcode}", expected ${title.toUpperCase()}-${docId}`);
await t.shot('document', `Document "${title}" created by the manager: "E2E document code" = ${title.toUpperCase()}-${docId}, the id included on creation`);

await t.done();
