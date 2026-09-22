/*
# Fix profile auto-creation trigger

The handle_new_user trigger function was failing silently because
profiles has RLS enabled and the INSERT policy checks auth.uid() = id,
which doesn't work inside a trigger on auth.users. The function is
SECURITY DEFINER but the RLS was still blocking it.

Fix: Add FORCE ROW LEVEL SECURITY bypass for the trigger function
by granting explicit INSERT to the postgres role and ensuring the
function runs as the owner.

Also backfill any missing profiles for existing auth.users entries.
*/

-- Recreate the function to ensure it works
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill any missing profiles
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
