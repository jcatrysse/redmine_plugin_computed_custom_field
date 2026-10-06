require File.expand_path('../../test_helper', __FILE__)

class ComputedCustomFieldTest < ComputedCustomFieldTestCase
  def test_patch_models
    models = [Document, Enumeration, Group, Issue, Project, TimeEntry, User, Version]
    models.each do |model|
      assert model.included_modules.include?(ComputedCustomField::ModelPatch)
    end
  end

  def test_patch_custom_field_and_issue
    # By name: referencing the constant would autoload the patch and hide a missing include
    assert_includes CustomField.included_modules.map(&:name), 'ComputedCustomField::CustomFieldPatch'
    assert_includes Issue.included_modules.map(&:name), 'ComputedCustomField::IssuePatch'
  end
end
