// Computed issue fields: values computed on create and update for every output
// format, the computed fields read-only in the issue form, the bulk edit form and
// the issue list column; as manager, reporter (core Reporter role) and outsider.
// Fields come from test/e2e/seed.rb ("E2E base" drives the others).
import { e2e } from '../../.codex/e2e/lib.mjs';

const P = 'e2e-project';
const t = await e2e('issue_computation');
const expect = (ok, what) => { if (!ok) t.problems.push(what); };

async function cfIds() {
  const auth = 'Basic ' + Buffer.from(`admin:${process.env.RMP_ADMIN_PASSWORD || 'Redmine7Test!'}`).toString('base64');
  const r = await t.page.request.get(`${t.BASE}/custom_fields.json`, { headers: { Authorization: auth } });
  return Object.fromEntries((await r.json()).custom_fields.map(c => [c.name, c.id]));
}
const value = async id => (await t.page.locator(`.issue .cf_${id} .value`).first().textContent().catch(() => '')).trim();

await t.login('manager');
const cf = await cfIds();
const computed = ['E2E double', 'E2E big', 'E2E level', 'E2E hours x1.5', 'E2E due + 1', 'E2E owner', 'E2E link', 'E2E boom'];

await t.go(`/projects/${P}/issues/new`);
for (const name of computed) {
  expect(await t.page.locator(`#issue_custom_field_values_${cf[name]}`).count() === 0, `new form: computed field ${name} has an input`);
}
expect(await t.page.locator(`#issue_custom_field_values_${cf['E2E base']}`).count() === 1, 'new form: E2E base has no input');
const subject = `E2E computed ${Date.now()}`;
await t.page.fill('#issue_subject', subject);
await t.page.fill(`#issue_custom_field_values_${cf['E2E base']}`, '21');
await t.page.fill('#issue_estimated_hours', '2');
await t.page.fill('#issue_due_date', '2026-12-30');
await t.page.selectOption('#issue_assigned_to_id', { label: 'Manager E2E' }).catch(() => t.problems.push('cannot assign Manager E2E'));
await t.shot('new-form', 'New issue form: only "E2E base" is an input, the computed fields are read-only and not shown');
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('create issue');
expect(/\/issues\/\d+$/.test(t.page.url()), `create issue: still on ${t.page.url()}`);
const issuePath = new URL(t.page.url()).pathname;
const want = { 'E2E double': '42', 'E2E big': 'Yes', 'E2E level': 'High', 'E2E hours x1.5': '3.00',
  'E2E due + 1': '12/31/2026', 'E2E owner': 'Manager E2E', 'E2E boom': 'ok' };
for (const [name, v] of Object.entries(want)) {
  const got = await value(cf[name]);
  expect(got.includes(v), `created issue: ${name} is "${got}", expected "${v}"`);
}
const createdId = new URL(t.page.url()).pathname.split('/').pop();
const link = await value(cf['E2E link']);
expect(link === `https://example.com/track/${createdId}`, `created issue: E2E link is "${link}", the id is missing`);
await t.shot('created', 'Created with E2E base 21, 2 h, due 2026-12-30, assignee Manager: double 42, big Yes, level High, hours 3.00, due+1 12/31/2026, owner, boom ok; the link carries the new id (computed again after the insert)');

await t.go(`${issuePath}/edit`);
for (const name of computed) {
  expect(await t.page.locator(`#issue_custom_field_values_${cf[name]}`).count() === 0, `edit form: computed field ${name} has an input`);
}
await t.page.fill(`#issue_custom_field_values_${cf['E2E base']}`, '4');
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('update issue');
for (const [name, v] of Object.entries({ 'E2E double': '8', 'E2E big': 'No', 'E2E level': 'Low' })) {
  const got = await value(cf[name]);
  expect(got === v, `updated issue: ${name} is "${got}", expected "${v}"`);
}
expect(await t.page.locator('#history .details li', { hasText: 'E2E link' }).count() === 0, 'update journaled a change of E2E link');
await t.shot('updated', 'After E2E base 21 -> 4: double 8, big No, level Low; the history lists only these changes (no late link change) of the computed fields is in the history');

const id = issuePath.split('/').pop();
await t.go(`/projects/${P}/issues?set_filter=1&f[]=subject&op[subject]=~&v[subject][]=${encodeURIComponent(subject)}` +
  `&c[]=subject&c[]=cf_${cf['E2E base']}&c[]=cf_${cf['E2E double']}&c[]=cf_${cf['E2E level']}`);
expect((await t.page.locator(`tr#issue-${id} td.cf_${cf['E2E double']}`).textContent().catch(() => '')).trim() === '8', 'issue list: E2E double column is not 8');
await t.shot('list-column', 'Issue list with E2E base, E2E double and E2E level as columns', { full: false });

await t.go(`/issues/bulk_edit?ids[]=${id}`);
expect(await t.page.locator(`#issue_custom_field_values_${cf['E2E base']}`).count() === 1, 'bulk edit: E2E base missing');
expect(await t.page.locator(`#issue_custom_field_values_${cf['E2E double']}`).count() === 0, 'bulk edit: E2E double is editable');
await t.shot('bulk-edit', 'Bulk edit offers E2E base but no computed field');

await t.login('reporter');
await t.go(issuePath);
expect((await value(cf['E2E double'])) === '8', 'reporter: E2E double not shown as 8');
await t.shot('as-reporter', 'A member without extra permissions (Reporter) sees the computed values');
await t.go(`/projects/${P}/issues/new`);
await t.page.fill('#issue_subject', `E2E reporter computed ${Date.now()}`);
await t.page.fill(`#issue_custom_field_values_${cf['E2E base']}`, '7');
expect(await t.page.locator(`#issue_custom_field_values_${cf['E2E double']}`).count() === 0, 'reporter new form: E2E double is editable');
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('reporter create issue');
expect((await value(cf['E2E double'])) === '14', 'reporter created issue: E2E double is not 14');
await t.shot('created-by-reporter', 'A Reporter creates an issue with E2E base 7: E2E double 14 is computed for them too');

await t.login('outsider');
await t.go('/projects/e2e-private/issues', { status: 403 });
await t.shot('outsider-refused', 'A non-member cannot reach the private project issues, computed values included');

await t.done();
