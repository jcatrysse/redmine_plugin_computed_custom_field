module ComputedCustomField
  def self.patch_models
    # Applied here and not only through eager loading (production), so that
    # development and test behave the same.
    unless CustomField.included_modules.include?(ComputedCustomField::CustomFieldPatch)
      CustomField.send :include, ComputedCustomField::CustomFieldPatch
    end
    unless Issue.included_modules.include?(ComputedCustomField::IssuePatch)
      Issue.send :include, ComputedCustomField::IssuePatch
    end

    unless CustomFieldsHelper.ancestors.include?(ComputedCustomField::CustomFieldTagPatch)
      CustomFieldsHelper.send :prepend, ComputedCustomField::CustomFieldTagPatch
    end

    models = [
      Enumeration, Group, Issue, Project,
      TimeEntry, User, Version
    ]
    models.each do |model|
      if model.included_modules
              .exclude?(ComputedCustomField::ModelPatch)
        model.send :include, ComputedCustomField::ModelPatch
      end
    end
  end
end
