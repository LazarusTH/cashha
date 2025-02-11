-- Create a deposit transaction with proper constraints and validations
create or replace function create_deposit_transaction(
  p_user_id uuid,
  p_amount decimal,
  p_depositor_name text
) returns json
language plpgsql
security definer
as $$
declare
  v_transaction_id uuid;
  v_user_status text;
  v_user_deposit_limit decimal;
  v_daily_deposit_sum decimal;
  v_daily_limit decimal := 50000; -- $50k daily limit
begin
  -- Check user exists and is active
  select status, deposit_limit
  into v_user_status, v_user_deposit_limit
  from profiles
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  if v_user_status != 'active' then
    raise exception 'User account is not active';
  end if;

  -- Check deposit limit
  if v_user_deposit_limit is not null and p_amount > v_user_deposit_limit then
    raise exception 'Amount exceeds deposit limit of %', v_user_deposit_limit;
  end if;

  -- Check daily deposit limit
  select coalesce(sum(amount), 0)
  into v_daily_deposit_sum
  from transactions
  where user_id = p_user_id
    and type = 'deposit'
    and created_at >= current_date
    and status != 'rejected';

  if v_daily_deposit_sum + p_amount > v_daily_limit then
    raise exception 'Daily deposit limit of % would be exceeded', v_daily_limit;
  end if;

  -- Create transaction
  insert into transactions (
    id,
    user_id,
    type,
    amount,
    status,
    metadata
  ) values (
    gen_random_uuid(),
    p_user_id,
    'deposit',
    p_amount,
    'pending',
    jsonb_build_object(
      'depositor_name', p_depositor_name,
      'created_at', current_timestamp,
      'daily_total', v_daily_deposit_sum + p_amount
    )
  )
  returning id into v_transaction_id;

  -- Return transaction details
  return jsonb_build_object(
    'id', v_transaction_id,
    'status', 'pending',
    'amount', p_amount,
    'daily_total', v_daily_deposit_sum + p_amount
  );
end;
$$;
