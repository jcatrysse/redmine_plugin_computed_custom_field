module ComputedCustomField
  # Checks the stored formulas without saving anything: the validation of the
  # custom field form (a blank object), then the last objects of each type.
  # A formula stored on an older Ruby or Rails can fail here, and would then
  # block every save of those objects.
  module FormulaCheck
    def self.run(sample: 20, io: $stdout)
      problems = 0
      CustomField.where(is_computed: true).order(:type, :id).each do |field|
        messages = []
        messages += field.errors[:formula] unless field.valid?
        klass = field.class.customized_class
        if klass && klass.included_modules.include?(ComputedCustomField::ModelPatch)
          klass.order(id: :desc).limit(sample).each do |object|
            object.send(:eval_computed_field, field)
            object.errors[:base].each { |m| messages << "#{klass.name} ##{object.id}: #{m}" }
          end
        end
        problems += 1 if messages.any?
        status = messages.any? ? 'FAIL' : 'ok  '
        io.puts "#{status} ##{field.id} #{field.type} \"#{field.name}\": #{field.formula.to_s.squish}"
        messages.uniq.first(5).each { |m| io.puts "       #{m}" }
      end
      io.puts "#{problems} computed field(s) with a failing formula"
      problems
    end
  end
end
