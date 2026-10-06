module ComputedCustomField
  # A computed field gets its value from the formula: forms show the value, not an input.
  module CustomFieldTagPatch
    def custom_field_tag(prefix, custom_value)
      return super unless custom_value.custom_field.is_computed?

      # formatted by the field format directly: show_value checks customized.visible?,
      # which enumerations (project activity settings) do not have
      formatted = custom_value.custom_field.format.formatted_custom_value(self, custom_value, true)
      formatted = format_object(formatted) unless formatted.nil? || formatted.is_a?(String)
      content_tag(:span, formatted, class: 'computed-value')
    end
  end
end
