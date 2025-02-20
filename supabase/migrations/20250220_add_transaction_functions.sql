-- Create transaction management functions
create or replace function begin_transaction()
returns void as $$
begin
  -- Set transaction isolation level
  set transaction isolation level serializable;
end;
$$ language plpgsql;

create or replace function commit_transaction()
returns void as $$
begin
  commit;
end;
$$ language plpgsql;

create or replace function rollback_transaction()
returns void as $$
begin
  rollback;
end;
$$ language plpgsql;
