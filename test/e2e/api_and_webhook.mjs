// REST API and the webhooks new in Redmine 7. Through the API a computed value
// cannot be set (the formula wins) and the computed values are returned; the
// private project stays closed to an outsider. A webhook created by the manager
// receives the issue payload with the computed values as they are stored.
// The webhook endpoint is a small HTTP server in this script, on the machine's
// non-loopback address (core refuses loopback targets).
import { e2e } from '../../.codex/e2e/lib.mjs';
import http from 'node:http';
import os from 'node:os';

const P = 'e2e-project';
const t = await e2e('api_and_webhook');
const expect = (ok, what) => { if (!ok) t.problems.push(what); };
const basic = (login, pw) => ({ Authorization: 'Basic ' + Buffer.from(`${login}:${pw || process.env.RMP_USER_PASSWORD || 'Redmine7Test!'}`).toString('base64') });
const admin = basic('admin', process.env.RMP_ADMIN_PASSWORD || 'Redmine7Test!');
const cfValue = (issue, name) => (issue.custom_fields.find(c => c.name === name) || {}).value;

await t.login('manager');
const cf = Object.fromEntries((await (await t.page.request.get(`${t.BASE}/custom_fields.json`, { headers: admin })).json())
  .custom_fields.map(c => [c.name, c.id]));

// --- REST API
const created = await t.page.request.post(`${t.BASE}/issues.json`, {
  headers: { ...basic('manager'), 'Content-Type': 'application/json' },
  data: { issue: { project_id: P, subject: `E2E API ${Date.now()}`,
    custom_fields: [{ id: cf['E2E base'], value: '5' }, { id: cf['E2E double'], value: '999' }] } },
});
const issue = (await created.json()).issue;
expect(created.status() === 201, `API create: HTTP ${created.status()}`);
expect(cfValue(issue, 'E2E double') === '10', `API create: E2E double is ${cfValue(issue, 'E2E double')}, expected 10 (999 was sent)`);
console.log(`API POST /issues.json base=5 double=999 -> HTTP ${created.status()}, E2E double=${cfValue(issue, 'E2E double')}`);

const updated = await t.page.request.put(`${t.BASE}/issues/${issue.id}.json`, {
  headers: { ...basic('manager'), 'Content-Type': 'application/json' },
  data: { issue: { custom_fields: [{ id: cf['E2E base'], value: '6' }, { id: cf['E2E double'], value: '1' }] } },
});
const after = (await (await t.page.request.get(`${t.BASE}/issues/${issue.id}.json`, { headers: basic('reporter') })).json()).issue;
expect(updated.status() === 204, `API update: HTTP ${updated.status()}`);
expect(cfValue(after, 'E2E double') === '12', `API update: E2E double is ${cfValue(after, 'E2E double')}, expected 12`);
console.log(`API PUT base=6 double=1 -> HTTP ${updated.status()}; GET as reporter: E2E double=${cfValue(after, 'E2E double')}`);
await t.go(`/issues/${issue.id}`);
await t.shot('api-issue', `Issue created and updated through the API with a forged "E2E double": the formula wins (5 -> 10, 6 -> 12)`);

const priv = (await (await t.page.request.get(`${t.BASE}/projects/e2e-private/issues.json`, { headers: basic('manager') })).json()).issues[0];
const outsider = await t.page.request.get(`${t.BASE}/issues/${priv.id}.json`, { headers: basic('outsider') });
expect(outsider.status() === 403 || outsider.status() === 404, `API: outsider reads a private issue, HTTP ${outsider.status()}`);
console.log(`API GET private issue as outsider -> HTTP ${outsider.status()}`);

// --- webhook
const host = Object.values(os.networkInterfaces()).flat().find(i => i && i.family === 'IPv4' && !i.internal)?.address;
const received = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => { received.push(body); res.end('ok'); });
}).listen(4567, '0.0.0.0');

await t.go('/webhooks/new');
await t.page.fill('#webhook_url', `http://${host}:4567/hook`);
await t.page.check('#webhook_active');
await t.page.check('#webhook_events_issue\\.updated');
await t.page.locator('#webhook_project_ids label', { hasText: 'E2E project' }).locator('input').check();
await t.shot('webhook-form', `The manager creates a webhook to http://${host}:4567/hook for issue updates in E2E project`);
await t.page.click('input[name=commit]');
await t.sudo();
await t.settle();
t.check('create webhook');
expect(await t.page.locator('tr', { hasText: `${host}:4567` }).count() === 1, 'webhook not created');
await t.shot('webhook-created', 'The webhook is created and active', { full: false });

await t.go(`/issues/${issue.id}/edit`);
await t.page.fill(`#issue_custom_field_values_${cf['E2E base']}`, '30');
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('update for webhook');
for (let i = 0; i < 40 && !received.length; i++) await new Promise(r => setTimeout(r, 500));
expect(received.length > 0, 'no webhook delivery within 20 s');
if (received.length) {
  const payload = JSON.parse(received[0]);
  const hooked = payload.data?.issue || payload.payload?.issue || payload.issue || {};
  const double = (hooked.custom_fields || []).find(c => c.name === 'E2E double');
  expect(double && double.value === '60', `webhook payload: E2E double is ${JSON.stringify(double)}, expected 60`);
  console.log(`webhook delivery: event ${payload.type || payload.event}, E2E base ${JSON.stringify((hooked.custom_fields || []).find(c => c.name === 'E2E base'))}, E2E double ${JSON.stringify(double)}`);
}
await t.shot('webhook-issue', `After E2E base 6 -> 30 the webhook payload carries E2E double = 60, the stored computed value`);

// remove the webhook so that a re-run starts clean
await t.go('/webhooks');
t.page.once('dialog', d => d.accept());
await t.page.locator('tr', { hasText: `${host}:4567` }).locator('a[data-method=delete], a.icon-del').first().click();
await t.sudo();
await t.settle();
t.check('delete webhook');
server.close();

await t.done();
