require File.expand_path('../../test_helper', __FILE__)

class CustomFieldsHelperPatchTest < Redmine::HelperTest
  include ApplicationHelper
  include CustomFieldsHelper
  include MethodsHelper
  fixtures(*FixturesHelper.fixtures)

  def test_computed_field_is_shown_without_input
    field = ProjectCustomField.new(name: 'Project code', field_format: 'string')
    field.is_computed = true
    field.formula = 'identifier.to_s.upcase'
    field.save!
    project = Project.find(1)
    project.save!
    value = project.custom_field_values.detect { |v| v.custom_field_id == field.id }

    html = custom_field_tag_with_label(:project, value)
    assert_not_include 'project_custom_field_values', html
    assert_include 'ECOOKBOOK', html
    assert_include 'Project code', html
  end

  def test_plain_field_keeps_its_input
    value = Project.find(1).custom_field_values.detect { |v| !v.custom_field.is_computed? }
    assert_include "project_custom_field_values_#{value.custom_field_id}",
                   custom_field_tag_with_label(:project, value)
  end
end
