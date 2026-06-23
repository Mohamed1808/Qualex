-- Fix: admin "Database error creating new user".
-- The handle_new_user trigger fires inside the auth.users insert, where the
-- `public` schema is not on the search path. Without a pinned search_path the
-- INSERT INTO profiles raised "relation profiles does not exist", which aborted
-- the entire user-creation transaction. Schema-qualify the table and pin the
-- function's search_path.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'telesales_agent')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
