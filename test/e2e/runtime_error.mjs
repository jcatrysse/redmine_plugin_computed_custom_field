// A formula that raises while an object is saved: the save is refused with
// "Error while formula computing in field ...", in the form and in the REST API,
// and nothing is stored. Seeded field "E2E boom" divides by zero when the subject
// contains BOOM, or contains LATE once the issue has an id (computed again after
// the insert: the creation keeps the earlier value, the next save is refused).
import { e2e } from '../../.codex/e2e/lib.mjs';

const P = 'e2e-project';
const t = await e2e('runtime_error');
const expect = (ok, what) => { if (!ok) t.problems.push(what); };
const message = 'Error while formula computing in field "E2E boom": divided by 0';
const adminAuth = 'Basic ' + Buffer.from(`admin:${process.env.RMP_ADMIN_PASSWORD || 'Redmine7Test!'}`).toString('base64');
const cfId = async name => (await (await t.page.request.get(`${t.BASE}/custom_fields.json`, { headers: { Authorization: adminAuth } })).json())
  .custom_fields.find(c => c.name === name).id;

await t.login('manager');
const subject = `E2E BOOM ${Date.now()}`;
await t.go(`/projects/${P}/issues/new`);
await t.page.fill('#issue_subject', subject);
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('create BOOM');
expect(await t.page.locator('#errorExplanation', { hasText: message }).count() === 1, 'create: the formula error is not shown');
await t.shot('create-refused', `Creating an issue whose subject makes "E2E boom" raise is refused: ${message}`);

// a formula that only fails once the issue has an id: the creation keeps the value
// computed before the insert (refusing after the insert is not safe), the next save refuses
const late = `E2E LATECASE ${Date.now()}`;
await t.go(`/projects/${P}/issues/new`);
await t.page.fill('#issue_subject', late);
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('create LATE');
expect(/\/issues\/\d+$/.test(new URL(t.page.url()).pathname), `create LATE: not created (${t.page.url()})`);
const boomLate = (await t.page.locator('.issue .cf_' + (await cfId('E2E boom')) + ' .value').textContent().catch(() => '')).trim();
expect(boomLate === 'ok', `create LATE: E2E boom is "${boomLate}", expected the value from before the insert`);
await t.shot('create-late', 'A formula that fails only once the id exists (subject LATECASE): created with the value from before the insert ("ok"), as on 5.1');
const latePath = new URL(t.page.url()).pathname;
await t.go(`${latePath}/edit`);
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('save LATE');
expect(await t.page.locator('#errorExplanation', { hasText: message }).count() === 1, 'save LATE: the formula error is not shown');
await t.shot('late-next-save-refused', 'The next save of that issue is refused with the formula error');

await t.go('/issues/1/edit');
await t.page.fill('#issue_subject', 'E2E assigned issue BOOM');
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('edit BOOM');
expect(await t.page.locator('#errorExplanation', { hasText: message }).count() === 1, 'edit: the formula error is not shown');
await t.shot('edit-refused', 'Editing an issue into the failing case is refused the same way');
await t.go('/issues/1');
expect(!(await t.page.locator('.subject h3').textContent()).includes('BOOM'), 'edit: the failing subject was stored');
await t.shot('edit-not-stored', 'The issue keeps its old subject');

const auth = 'Basic ' + Buffer.from(`manager:${process.env.RMP_USER_PASSWORD || 'Redmine7Test!'}`).toString('base64');
const r = await t.page.request.post(`${t.BASE}/issues.json`, {
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  data: { issue: { project_id: P, subject } },
});
const body = await r.text();
expect(r.status() === 422 && JSON.parse(body).errors.includes(message), `API create: HTTP ${r.status()} ${body}`);
console.log(`API POST /issues.json (subject BOOM) -> HTTP ${r.status()} ${body}`);
await t.go(`/projects/${P}/issues?set_filter=1&f[]=subject&op[subject]=~&v[subject][]=BOOM`);
expect(await t.page.locator('table.issues tr.issue').count() === 0, 'an issue with BOOM was stored');
await t.shot('nothing-stored', `No issue with BOOM exists; the API answered HTTP ${r.status()} with the same error`, { full: false });

await t.done();
