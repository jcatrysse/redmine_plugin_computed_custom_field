require File.expand_path('../../test_helper', __FILE__)

class FormulaCheckTest < ComputedCustomFieldTestCase
  def test_reports_a_stored_formula_that_fails
    good = field_with_string_format
    good.update_attribute(:formula, 'subject.to_s')
    bad = field_with_int_format
    # stored without validation, as a formula saved on an older Ruby or Rails
    bad.update_column(:formula, 'start_date.to_s(:db).length')
    io = StringIO.new

    assert_no_difference 'CustomValue.count' do
      assert_equal 1, ComputedCustomField::FormulaCheck.run(io: io)
    end
    assert_match(/^ok   ##{good.id} /, io.string)
    assert_match(/^FAIL ##{bad.id} /, io.string)
    assert_match(/wrong number of arguments/, io.string)
  end
end
