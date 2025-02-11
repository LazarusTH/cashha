-- Create a notification for deposit transactions
create or replace function create_deposit_notification(
  p_user_id uuid,
  p_amount decimal,
  p_transaction_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_user_name text;
begin
  -- Get user's name
  select full_name
  into v_user_name
  from profiles
  where id = p_user_id;

  -- Create notification for admin
  insert into notifications (
    id,
    user_id,
    type,
    title,
    content,
    metadata,
    priority,
    status
  ) values (
    gen_random_uuid(),
    p_user_id,
    'deposit_request',
    'New Deposit Request',
    format('%s has requested a deposit of $%s', v_user_name, p_amount::text),
    jsonb_build_object(
      'transaction_id', p_transaction_id,
      'amount', p_amount,
      'user_id', p_user_id
    ),
    case
      when p_amount >= 10000 then 'high'
      when p_amount >= 1000 then 'medium'
      else 'low'
    end,
    'unread'
  );

  -- Create notification for user
  insert into notifications (
    id,
    user_id,
    type,
    title,
    content,
    metadata,
    priority,
    status
  ) values (
    gen_random_uuid(),
    p_user_id,
    'deposit_submitted',
    'Deposit Request Submitted',
    format('Your deposit request for $%s has been submitted and is pending review.', p_amount::text),
    jsonb_build_object(
      'transaction_id', p_transaction_id,
      'amount', p_amount
    ),
    'low',
    'unread'
  );
end;
$$;
