-- Fix RLS policies to use auth.jwt() instead of querying auth.users
-- The authenticated role lacks SELECT on auth.users, causing 403 errors

-- Drop and recreate reviews policies using auth.jwt() ->> 'email'
DROP POLICY IF EXISTS "select_reviews" ON reviews;
DROP POLICY IF EXISTS "insert_reviews" ON reviews;
DROP POLICY IF EXISTS "update_reviews" ON reviews;
DROP POLICY IF EXISTS "delete_reviews" ON reviews;

-- SELECT: anon sees only approved; authenticated admins see all
CREATE POLICY "select_reviews" ON reviews FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'
    OR EXISTS (
      SELECT 1 FROM admin_emails ae
      WHERE ae.email = (auth.jwt() ->> 'email')
    )
  );

-- INSERT: anyone can submit (defaults to pending)
CREATE POLICY "insert_reviews" ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- UPDATE: only admins
CREATE POLICY "update_reviews" ON reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_emails ae
      WHERE ae.email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_emails ae
      WHERE ae.email = (auth.jwt() ->> 'email')
    )
  );

-- DELETE: only admins
CREATE POLICY "delete_reviews" ON reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_emails ae
      WHERE ae.email = (auth.jwt() ->> 'email')
    )
  );

-- Fix admin_emails policies too
DROP POLICY IF EXISTS "insert_admin_emails" ON admin_emails;
DROP POLICY IF EXISTS "delete_admin_emails" ON admin_emails;

CREATE POLICY "insert_admin_emails" ON admin_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_emails ae
      WHERE ae.email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "delete_admin_emails" ON admin_emails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_emails ae
      WHERE ae.email = (auth.jwt() ->> 'email')
    )
  );
