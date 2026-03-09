-- Create a function to get the correct asset account ID based on payment method
CREATE OR REPLACE FUNCTION public.get_payment_asset_account(p_payment_method text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_payment_method
    WHEN 'cash' THEN '874f7315-8619-4eef-9f6b-7dac33e7c416'::uuid
    WHEN 'bank' THEN 'b954bcb8-72bc-497d-adef-9cf5749e4289'::uuid
    WHEN 'check' THEN 'b954bcb8-72bc-497d-adef-9cf5749e4289'::uuid
    WHEN 'mobile' THEN '3cb7442b-8c85-4fc5-9bcb-5c80814d913c'::uuid
    ELSE '874f7315-8619-4eef-9f6b-7dac33e7c416'::uuid
  END;
$$;

-- Create a function to recalculate all chart_of_accounts balances from general_ledger
CREATE OR REPLACE FUNCTION public.recalculate_account_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chart_of_accounts coa
  SET current_balance = coa.opening_balance + COALESCE(
    (SELECT SUM(gl.debit) - SUM(gl.credit)
     FROM general_ledger gl
     WHERE gl.account_id = coa.id),
    0
  ),
  updated_at = now();
END;
$$;

-- Create a trigger function to auto-recalculate affected account balance after ledger changes
CREATE OR REPLACE FUNCTION public.update_account_balance_on_ledger_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_account_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_account_id := OLD.account_id;
  ELSE
    affected_account_id := NEW.account_id;
  END IF;

  UPDATE chart_of_accounts
  SET current_balance = opening_balance + COALESCE(
    (SELECT SUM(debit) - SUM(credit)
     FROM general_ledger
     WHERE account_id = affected_account_id),
    0
  ),
  updated_at = now()
  WHERE id = affected_account_id;

  -- Also update the old account if account_id changed on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.account_id != NEW.account_id THEN
    UPDATE chart_of_accounts
    SET current_balance = opening_balance + COALESCE(
      (SELECT SUM(debit) - SUM(credit)
       FROM general_ledger
       WHERE account_id = OLD.account_id),
      0
    ),
    updated_at = now()
    WHERE id = OLD.account_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to general_ledger
DROP TRIGGER IF EXISTS trg_update_account_balance ON general_ledger;
CREATE TRIGGER trg_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON general_ledger
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_ledger_change();

-- Create a function to get financial summary from real data
CREATE OR REPLACE FUNCTION public.get_financial_summary()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_total_sales numeric;
  v_income_received numeric;
  v_total_expense numeric;
  v_customer_due numeric;
  v_total_commission numeric;
  v_cash_balance numeric;
  v_bank_balance numeric;
  v_mobile_balance numeric;
  v_receivable numeric;
  v_payable numeric;
BEGIN
  -- Total Sales = sum of all confirmed/completed booking total_price
  SELECT COALESCE(SUM(total_price), 0) INTO v_total_sales
  FROM bookings WHERE status IN ('confirmed', 'completed');

  -- Income Received = sum from income_transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_income_received
  FROM income_transactions;

  -- Total Expense = sum from expense_transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expense
  FROM expense_transactions;

  -- Customer Due = total_sales - total payments received on those bookings
  SELECT COALESCE(SUM(
    CASE 
      WHEN b.payment_status = 'paid' THEN 0
      ELSE b.total_price - COALESCE(
        (SELECT ep.advance_amount + COALESCE(
          (SELECT SUM(ei.amount) FROM emi_installments ei WHERE ei.emi_payment_id = ep.id AND ei.status = 'paid'), 0
        ) FROM emi_payments ep WHERE ep.booking_id = b.id LIMIT 1),
        CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END
      )
    END
  ), 0) INTO v_customer_due
  FROM bookings b WHERE b.status IN ('confirmed', 'completed', 'pending');

  -- Commission = pending_commission from agents
  SELECT COALESCE(SUM(pending_commission), 0) INTO v_total_commission
  FROM agents WHERE is_active = true;

  -- Account balances from chart_of_accounts
  SELECT COALESCE(current_balance, 0) INTO v_cash_balance
  FROM chart_of_accounts WHERE account_code = '1000';

  SELECT COALESCE(current_balance, 0) INTO v_bank_balance
  FROM chart_of_accounts WHERE account_code = '1010';

  SELECT COALESCE(current_balance, 0) INTO v_mobile_balance
  FROM chart_of_accounts WHERE account_code = '1030';

  SELECT COALESCE(current_balance, 0) INTO v_receivable
  FROM chart_of_accounts WHERE account_code = '1020';

  SELECT COALESCE(current_balance, 0) INTO v_payable
  FROM chart_of_accounts WHERE account_code = '2000';

  result := json_build_object(
    'total_sales', v_total_sales,
    'income_received', v_income_received,
    'total_expense', v_total_expense,
    'net_profit', v_income_received - v_total_expense,
    'customer_due', v_customer_due,
    'commission', v_total_commission,
    'cash_balance', v_cash_balance,
    'bank_balance', v_bank_balance,
    'mobile_balance', v_mobile_balance,
    'receivable', v_receivable,
    'payable', v_payable,
    'total_liquid', v_cash_balance + v_bank_balance + v_mobile_balance
  );

  RETURN result;
END;
$$;