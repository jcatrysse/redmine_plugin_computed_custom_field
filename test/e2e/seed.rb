# Data for this plugin's end-to-end scenarios, run by .codex/start_server.sh after
# the generic seed (.codex/e2e/seed.rb). Idempotent.
#
# One computed field per customizable model, and on issues one per output format,
# all driven by the plain integer field "E2E base". "E2E boom" raises when an
# issue subject contains BOOM, for the runtime error path.

User.current = User.find_by(login: 'admin')

def e2e_cf(klass, name, attrs = {})
  field = klass.find_by(name: name) || klass.new(name: name)
  field.attributes = { visible: true }.merge(attrs.except(:formula))
  field.formula = attrs[:formula] if attrs.key?(:formula)
  field.is_for_all = true if field.respond_to?(:is_for_all=)
  field.trackers = Tracker.all if field.is_a?(IssueCustomField)
  field.save!
  field
end

base = e2e_cf(IssueCustomField, 'E2E base', field_format: 'int')
b = "(cfs[#{base.id}] || 0)"
e2e_cf(IssueCustomField, 'E2E double', field_format: 'int', is_computed: true, formula: "#{b} * 2")
e2e_cf(IssueCustomField, 'E2E big', field_format: 'bool', is_computed: true, formula: "#{b} > 10")
e2e_cf(IssueCustomField, 'E2E level', field_format: 'list', possible_values: %w[Low High],
                                      is_computed: true, formula: "#{b} > 10 ? 'High' : 'Low'")
e2e_cf(IssueCustomField, 'E2E hours x1.5', field_format: 'float', is_computed: true,
                                           formula: '((estimated_hours || 0) * 1.5).round(2)')
e2e_cf(IssueCustomField, 'E2E due + 1', field_format: 'date', is_computed: true,
                                        formula: 'due_date && due_date + 1')
e2e_cf(IssueCustomField, 'E2E owner', field_format: 'user', is_computed: true, formula: 'assigned_to')
e2e_cf(IssueCustomField, 'E2E link', field_format: 'link', is_computed: true,
                                     formula: '"https://example.com/track/#{id}"')
e2e_cf(IssueCustomField, 'E2E boom', field_format: 'string', is_computed: true,
                                     formula: "subject.to_s.include?('BOOM') ? 1 / 0 : 'ok'")

e2e_cf(ProjectCustomField, 'E2E project code', field_format: 'string', is_computed: true,
                                               formula: '"#{identifier.to_s.upcase}-#{id}"')
e2e_cf(UserCustomField, 'E2E display name', field_format: 'string', is_computed: true,
                                            formula: '"#{lastname}, #{firstname}"')
e2e_cf(VersionCustomField, 'E2E name length', field_format: 'int', is_computed: true,
                                              formula: 'name.to_s.length')
e2e_cf(TimeEntryCustomField, 'E2E minutes', field_format: 'int', is_computed: true,
                                            formula: '(hours.to_f * 60).round')
e2e_cf(GroupCustomField, 'E2E group slug', field_format: 'string', is_computed: true,
                                           formula: 'lastname.to_s.parameterize')
e2e_cf(TimeEntryActivityCustomField, 'E2E activity code', field_format: 'string', is_computed: true,
                                                          formula: 'name.to_s.upcase')

# webhooks (new in Redmine 7) are off by default; test/e2e/webhook.mjs needs them
Setting.webhooks_enabled = '1' if Setting.respond_to?(:webhooks_enabled=)

Group.find_by(lastname: 'E2E group') || Group.create!(lastname: 'E2E group')

puts "Plugin seed: #{CustomField.where(is_computed: true).count} computed custom fields"
