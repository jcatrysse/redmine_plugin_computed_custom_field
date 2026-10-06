# formula_form

Run 2026-10-06T19:45:57.561Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](formula_form-new-unticked.png) | admin | `/custom_fields/new?type=IssueCustomField` | New issue custom field: "Computed" unticked, formula and available fields disabled |
| ![](formula_form-new-filled.png) | admin | `/custom_fields/new?type=IssueCustomField` | Integer, "Computed" ticked, a double-click on "E2E base" inserted cfs[1], " * 3" typed |
| ![](formula_form-created.png) | admin | `/custom_fields?tab=IssueCustomField` | The computed field is created and listed |
| ![](formula_form-edit-computed.png) | admin | `/custom_fields/16/edit` | Edit: "Computed" is ticked and locked, the formula is kept, the field does not list itself |
| ![](formula_form-still-computed.png) | admin | `/custom_fields/16/edit` | After a crafted request with "Computed" off the field is still computed |
| ![](formula_form-edit-plain.png) | admin | `/custom_fields/1/edit` | Edit of a saved plain field: no computed section (cannot become computed) |
| ![](formula_form-new-project-field.png) | admin | `/custom_fields/new?type=ProjectCustomField` | New project custom field: only project fields are offered |
| ![](formula_form-new-empty-list.png) | admin | `/custom_fields/new?type=DocumentCategoryCustomField` | Empty state: no other document category field, the list is empty |
| ![](formula_form-refused-manager.png) | manager | `/custom_fields/new?type=IssueCustomField` | manager: the custom field form (and so formulas) is refused, admin only |
| ![](formula_form-refused-reporter.png) | reporter | `/custom_fields/new?type=IssueCustomField` | reporter: the custom field form (and so formulas) is refused, admin only |
