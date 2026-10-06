// A formula that raises while an object is saved: the save is refused with
// "Error while formula computing in field ...", in the form and in the REST API,
// and nothing is stored. Seeded field "E2E boom" divides by zero when the subject
// contains BOOM, or contains LATE once the issue has an id (computed after the insert).
import { e2e } from '../../.codex/e2e/lib.mjs';

const P = 'e2e-project';
const t = await e2e('runtime_error');
const expect = (ok, what) => { if (!ok) t.problems.push(what); };
const message = 'Error while formula computing in field "E2E boom": divided by 0';

await t.login('manager');
const subject = `E2E BOOM ${Date.now()}`;
await t.go(`/projects/${P}/issues/new`);
await t.page.fill('#issue_subject', subject);
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('create BOOM');
expect(await t.page.locator('#errorExplanation', { hasText: message }).count() === 1, 'create: the formula error is not shown');
await t.shot('create-refused', `Creating an issue whose subject makes "E2E boom" raise is refused: ${message}`);

// a formula that only fails once the issue has an id: the creation is rolled back
const late = `E2E LATECASE ${Date.now()}`;
await t.go(`/projects/${P}/issues/new`);
await t.page.fill('#issue_subject', late);
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('create LATE');
expect(await t.page.locator('#errorExplanation', { hasText: message }).count() === 1, 'create LATE: the formula error is not shown');
expect(/\/issues\/new$|\/issues$/.test(new URL(t.page.url()).pathname), `create LATE: left the form (${t.page.url()})`);
await t.shot('create-late-refused', 'A formula that fails only once the id exists (subject LATE): the creation is rolled back with the error');

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
const lateApi = await t.page.request.post(`${t.BASE}/issues.json`, {
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  data: { issue: { project_id: P, subject: late } },
});
const lateBody = await lateApi.text();
expect(lateApi.status() === 422 && JSON.parse(lateBody).errors.includes(message), `API create LATE: HTTP ${lateApi.status()} ${lateBody}`);
console.log(`API POST /issues.json (subject LATE) -> HTTP ${lateApi.status()} ${lateBody}`);
await t.go(`/projects/${P}/issues?set_filter=1&f[]=status_id&op[status_id]=*&f[]=subject&op[subject]=~&v[subject][]=LATECASE`);
expect(await t.page.locator('table.issues tr.issue').count() === 0, 'an issue with LATE was stored');
await t.shot('late-not-stored', 'No issue with LATE exists: form and API creation were both rolled back', { full: false });
await t.shot('nothing-stored', `No issue with BOOM exists; the API answered HTTP ${r.status()} with the same error (and HTTP ${lateApi.status()} for LATE, nothing stored)`, { full: false });

await t.done();
