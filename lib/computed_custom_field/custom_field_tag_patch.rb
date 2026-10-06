module ComputedCustomField
  # A computed field gets its value from the formula: forms show the value, not an input.
  module CustomFieldTagPatch
    def custom_field_tag(prefix, custom_value)
      return super unless custom_value.custom_field.is_computed?

      content_tag(:span, show_value(custom_value), class: 'computed-value')
    end
  end
end
