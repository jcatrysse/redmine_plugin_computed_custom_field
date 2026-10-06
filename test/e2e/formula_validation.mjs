// Invalid formulas are refused with the error shown, on create and on edit:
// division by zero, a syntax error, a Rails 5 API that is gone (to_s(:db)), and a
// reference to a custom field that does not exist. On Redmine 7 before the fix in
// formula_validator.rb all of these were saved silently.
import { e2e } from '../../.codex/e2e/lib.mjs';

const t = await e2e('formula_validation');
const expect = (ok, what) => { if (!ok) t.problems.push(what); };

async function cfIds() {
  const auth = 'Basic ' + Buffer.from(`admin:${process.env.RMP_ADMIN_PASSWORD || 'Redmine7Test!'}`).toString('base64');
  const r = await t.page.request.get(`${t.BASE}/custom_fields.json`, { headers: { Authorization: auth } });
  return Object.fromEntries((await r.json()).custom_fields.map(c => [c.name, c.id]));
}

await t.login('admin');
const before = Object.keys(await cfIds()).length;
const cases = [
  ['divided-by-zero', '1 / 0', /divided by 0/],
  ['syntax-error', 'cfs[1] +', /syntax|unexpected/i],
  ['removed-api', 'start_date.to_s(:db)', /wrong number of arguments/],
  ['unknown-field', 'cfs[999999] * 2', /undefined method|NoMethodError|for nil/],
];
for (const [key, formula, message] of cases) {
  await t.go('/custom_fields/new?type=IssueCustomField');
  await t.page.fill('#custom_field_name', `E2E bad ${key}`);
  await t.page.check('#custom_field_is_computed');
  await t.page.fill('#custom_field_formula', formula);
  await t.page.click('input[name=commit]');
  await t.sudo();
  await t.settle();
  t.check(`create ${key}`);
  const errors = await t.page.locator('#errorExplanation').textContent().catch(() => '');
  expect(/Formula/.test(errors) && message.test(errors) && !/Name/.test(errors), `${key}: "${formula}" not refused with the reason, got "${errors.trim()}"`);
  await t.shot(`create-${key}`, `Create with formula "${formula}" is refused: ${errors.trim().replace(/\s+/g, ' ').slice(0, 90)}`);
}
expect(Object.keys(await cfIds()).length === before, 'an invalid computed field was created');

const cf = await cfIds();
await t.go(`/custom_fields/${cf['E2E double']}/edit`);
const original = await t.page.inputValue('#custom_field_formula');
await t.page.fill('#custom_field_formula', '1 / 0');
await t.page.click('input[name=commit]');
await t.sudo();
await t.settle();
t.check('edit invalid');
expect(await t.page.locator('#errorExplanation', { hasText: 'divided by 0' }).count() === 1, 'edit to 1 / 0 not refused');
await t.shot('edit-refused', 'Changing the formula of "E2E double" to 1 / 0 is refused with the reason');
await t.go(`/custom_fields/${cf['E2E double']}/edit`);
expect((await t.page.inputValue('#custom_field_formula')) === original, 'the invalid formula was stored');
await t.shot('edit-kept', `The stored formula is unchanged: ${original}`);

await t.done();
