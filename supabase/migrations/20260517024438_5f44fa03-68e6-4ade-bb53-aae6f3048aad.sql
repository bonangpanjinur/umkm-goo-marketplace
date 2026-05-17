
-- Create 3 demo auth users (password: demo1234) using bcrypt of 'demo1234'
DO $$
DECLARE
  u1 uuid := '11111111-1111-1111-1111-111111111111';
  u2 uuid := '22222222-2222-2222-2222-222222222222';
  u3 uuid := '33333333-3333-3333-3333-333333333333';
BEGIN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES
    (u1, '00000000-0000-0000-0000-000000000000', 'owner@umkmgo.id', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Demo Owner 1"}', 'authenticated', 'authenticated'),
    (u2, '00000000-0000-0000-0000-000000000000', 'owner2@umkmgo.id', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Demo Owner 2"}', 'authenticated', 'authenticated'),
    (u3, '00000000-0000-0000-0000-000000000000', 'owner3@umkmgo.id', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Demo Owner 3"}', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
  VALUES
    (gen_random_uuid(), u1, jsonb_build_object('sub', u1::text, 'email', 'owner@umkmgo.id', 'email_verified', true), 'email', u1::text, now(), now(), now()),
    (gen_random_uuid(), u2, jsonb_build_object('sub', u2::text, 'email', 'owner2@umkmgo.id', 'email_verified', true), 'email', u2::text, now(), now(), now()),
    (gen_random_uuid(), u3, jsonb_build_object('sub', u3::text, 'email', 'owner3@umkmgo.id', 'email_verified', true), 'email', u3::text, now(), now(), now())
  ON CONFLICT DO NOTHING;
END $$;
