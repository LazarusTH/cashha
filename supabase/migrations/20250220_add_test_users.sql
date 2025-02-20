-- Create test users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, phone, phone_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, refresh_token, is_sso_user, deleted_at)
VALUES
  -- Admin Users
  ('00000000-0000-0000-0000-000000000001', 'admin1@test.com', crypt('admin123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, NULL, NULL, '', '', '', '', 0, NULL, '', '', false, NULL),
  ('00000000-0000-0000-0000-000000000002', 'admin2@test.com', crypt('admin123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, NULL, NULL, '', '', '', '', 0, NULL, '', '', false, NULL),
  
  -- Regular Users
  ('00000000-0000-0000-0000-000000000003', 'user1@test.com', crypt('user123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, NULL, NULL, '', '', '', '', 0, NULL, '', '', false, NULL),
  ('00000000-0000-0000-0000-000000000004', 'user2@test.com', crypt('user123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, NULL, NULL, '', '', '', '', 0, NULL, '', '', false, NULL);

-- Create corresponding profiles with roles
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
VALUES
  -- Admin Profiles
  ('00000000-0000-0000-0000-000000000001', 'admin1@test.com', 'admin', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'admin2@test.com', 'admin', now(), now()),
  
  -- Regular User Profiles
  ('00000000-0000-0000-0000-000000000003', 'user1@test.com', 'user', now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'user2@test.com', 'user', now(), now());

-- Add any additional data needed for testing
INSERT INTO public.wallets (id, user_id, balance, currency, created_at, updated_at)
VALUES
  -- Admin Wallets
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 1000.00, 'USD', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 1000.00, 'USD', now(), now()),
  
  -- Regular User Wallets
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 500.00, 'USD', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', 500.00, 'USD', now(), now());

-- Create a function to reset test data if needed
CREATE OR REPLACE FUNCTION reset_test_data()
RETURNS void AS $$
BEGIN
  -- Delete test users and their related data
  DELETE FROM public.wallets WHERE user_id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004'
  );
  
  DELETE FROM public.profiles WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004'
  );
  
  DELETE FROM auth.users WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004'
  );
END;
$$ LANGUAGE plpgsql;
