# runtime_error

Run 2026-10-06T19:46:16.650Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](runtime_error-create-refused.png) | manager | `/projects/e2e-project/issues` | Creating an issue whose subject makes "E2E boom" raise is refused: Error while formula computing in field "E2E boom": divided by 0 |
| ![](runtime_error-edit-refused.png) | manager | `/issues/1` | Editing an issue into the failing case is refused the same way |
| ![](runtime_error-edit-not-stored.png) | manager | `/issues/1` | The issue keeps its old subject |
| ![](runtime_error-nothing-stored.png) | manager | `/projects/e2e-project/issues?set_filter=1&f[]=subject&op[subject]=~&v[subject][]=BOOM` | No issue with BOOM exists; the API answered HTTP 422 with the same error |
