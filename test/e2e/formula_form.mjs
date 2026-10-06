// The admin custom field form: the "Computed" checkbox enables the formula and the
// list of available fields, a double-click inserts cfs[id], the section survives a
// format change, a computed field can be created, and "Computed" cannot be turned
// off afterwards (not even with a crafted request). Custom fields are admin only.
import { e2e } from '../../.codex/e2e/lib.mjs';

const t = await e2e('formula_form');
const expect = (ok, what) => { if (!ok) t.problems.push(what); };

async function cfIds() {
  const auth = 'Basic ' + Buffer.from(`admin:${process.env.RMP_ADMIN_PASSWORD || 'Redmine7Test!'}`).toString('base64');
  const r = await t.page.request.get(`${t.BASE}/custom_fields.json`, { headers: { Authorization: auth } });
  return Object.fromEntries((await r.json()).custom_fields.map(c => [c.name, c.id]));
}

await t.login('admin');
const cf = await cfIds();
await t.go('/custom_fields/new?type=IssueCustomField');
expect(await t.page.locator('#custom_field_formula').isDisabled(), 'formula is enabled before "Computed" is ticked');
await t.shot('new-unticked', 'New issue custom field: "Computed" unticked, formula and available fields disabled');

// changing the format re-renders the form through XHR; the section and its script must survive
await t.page.selectOption('#custom_field_field_format', 'int');
await t.page.waitForFunction(() => document.querySelector('#custom_field_field_format').value === 'int');
await t.settle();
t.check('format change');
expect(await t.page.locator('#custom_field_is_computed').count() === 1, 'the Computed checkbox is gone after a format change');

await t.page.check('#custom_field_is_computed');
expect(!(await t.page.locator('#custom_field_formula').isDisabled()), 'formula still disabled after ticking "Computed"');
await t.page.dblclick(`#available_cfs option[value="${cf['E2E base']}"]`);
await t.page.locator('#custom_field_formula').press('End');
await t.page.locator('#custom_field_formula').pressSequentially(' * 3');
const formula = await t.page.inputValue('#custom_field_formula');
expect(formula === `cfs[${cf['E2E base']}] * 3`, `double-click inserted "${formula}"`);
const name = `E2E triple ${Date.now()}`;
await t.page.fill('#custom_field_name', name);
await t.page.check('#custom_field_is_for_all');
for (const box of await t.page.locator('input[type=checkbox][name="custom_field[tracker_ids][]"]').all()) await box.check();
await t.shot('new-filled', `Integer, "Computed" ticked, a double-click on "E2E base" inserted cfs[${cf['E2E base']}], " * 3" typed`);
await t.page.click('input[name=commit]');
await t.sudo();
await t.settle();
t.check('create computed field');
expect(await t.page.locator('#flash_notice').count() === 1, 'no "Successful creation" after creating the computed field');
await t.shot('created', 'The computed field is created and listed');

const id = (await cfIds())[name];
await t.go(`/custom_fields/${id}/edit`);
expect(await t.page.locator('#custom_field_is_computed').isChecked(), 'edit: Computed not ticked');
expect(await t.page.locator('#custom_field_is_computed').isDisabled(), 'edit: Computed can be changed');
expect((await t.page.inputValue('#custom_field_formula')) === formula, 'edit: formula not kept');
expect(await t.page.locator(`#available_cfs option[value="${id}"]`).count() === 0, 'edit: the field lists itself');
await t.shot('edit-computed', 'Edit: "Computed" is ticked and locked, the formula is kept, the field does not list itself');

// a crafted request that unticks "Computed" is ignored by the model
await t.page.evaluate(() => {
  const box = document.querySelector('#custom_field_is_computed');
  box.disabled = false; box.checked = false;
  document.querySelectorAll('input[type=hidden][name="custom_field[is_computed]"]').forEach(h => { h.disabled = false; });
});
await t.page.click('input[name=commit]');
await t.sudo();
await t.settle();
t.check('crafted untick');
await t.go(`/custom_fields/${id}/edit`);
expect(await t.page.locator('#custom_field_is_computed').isChecked(), 'a crafted request turned "Computed" off');
await t.shot('still-computed', 'After a crafted request with "Computed" off the field is still computed');

await t.go(`/custom_fields/${cf['E2E base']}/edit`);
expect(await t.page.locator('#custom_field_is_computed').count() === 0, 'a saved plain field shows the Computed section');
await t.shot('edit-plain', 'Edit of a saved plain field: no computed section (cannot become computed)');

await t.go('/custom_fields/new?type=ProjectCustomField');
expect(await t.page.locator(`#available_cfs option[value="${cf['E2E project code']}"]`).count() === 1, 'project field form: E2E project code not offered');
expect(await t.page.locator(`#available_cfs option[value="${cf['E2E base']}"]`).count() === 0, 'project field form offers issue fields');
await t.shot('new-project-field', 'New project custom field: only project fields are offered');

await t.go('/custom_fields/new?type=DocumentCategoryCustomField');
expect(await t.page.locator('#available_cfs option').count() === 0, 'document category form: fields offered');
await t.shot('new-empty-list', 'Empty state: no other document category field, the list is empty');

// remove the field again so that a re-run starts from the same data
await t.go('/custom_fields?tab=IssueCustomField');
t.page.once('dialog', d => d.accept());
await t.page.locator('tr', { hasText: name }).locator('a.icon-del, a[data-method=delete]').first().click();
await t.sudo();
await t.settle();
t.check('delete field');

for (const login of ['manager', 'reporter']) {
  await t.login(login);
  await t.go('/custom_fields/new?type=IssueCustomField', { status: 403 });
  await t.shot(`refused-${login}`, `${login}: the custom field form (and so formulas) is refused, admin only`);
}
await t.done();
