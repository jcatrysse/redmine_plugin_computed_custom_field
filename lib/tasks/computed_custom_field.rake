namespace :redmine do
  namespace :computed_custom_field do
    desc 'Check every stored formula (nothing is saved). SAMPLE=20 objects per field. Exit 1 on a failing formula.'
    task check_formulas: :environment do
      exit 1 if ComputedCustomField::FormulaCheck.run(sample: (ENV['SAMPLE'] || 20).to_i) > 0
    end
  end
end
