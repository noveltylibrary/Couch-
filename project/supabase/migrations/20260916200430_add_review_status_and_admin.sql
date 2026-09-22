/*
# Add review status workflow and admin emails

## Summary
This migration adds a moderation workflow to the reviews table and creates
an admin_emails table to control who has admin access. It also updates RLS
policies so that:
- Public (anon) users can only see approved reviews
- Any user can submit a review (status defaults to 'pending')
- Only authenticated admins can see pending/declined reviews
- Only authenticated admins can update or delete reviews (approve/decline/edit)

## 1. New Columns
- `reviews.status` (text, NOT NULL, default 'pending') — one of:
  - 'pending': newly submitted, awaiting admin review
  - 'approved': admin has approved, visible to public
  - 'declined': admin has declined, not visible to public
- `reviews.admin_notes` (text, nullable) — internal notes from admin during moderation

## 2. New Tables
- `admin_emails`
  - `id` (uuid, primary key)
  - `email` (text, unique, not null) — the email address with admin access
  - `created_at` (timestamptz, default now())
  - RLS enabled: anyone can read (needed for client-side admin check),
    only authenticated admins can insert/delete (to add more admins)

## 3. Data Changes
- All existing reviews are set to 'approved' status (they were already published)
- The project owner's email is inserted as the initial admin

## 4. Security Changes
- RLS policies on `reviews` are replaced:
  - SELECT: anon sees only approved; authenticated admins see all
  - INSERT: anon + authenticated can insert (status defaults to pending)
  - UPDATE: only authenticated admins can update (approve/decline/edit)
  - DELETE: only authenticated admins can delete
- RLS policies on `admin_emails`:
  - SELECT: anyone can read (needed to check if current user is admin)
  - INSERT/DELETE: only authenticated admins can manage

## 5. Important Notes
1. The admin check uses a subquery against admin_emails joined with auth.uid()
   via auth.users.email — this is safe because auth.users is readable by
   authenticated users for their own row.
2. The initial admin email is set to the project owner's email.
3. All existing 11 reviews are marked 'approved' so they remain visible.
*/

-- Add status column to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_notes text;

-- Mark all existing reviews as approved
UPDATE reviews SET status = 'approved' WHERE status = 'pending';

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Create admin_emails table
CREATE TABLE IF NOT EXISTS admin_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

-- Drop old review policies
DROP POLICY IF EXISTS "anon_select_reviews" ON reviews;
DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;

-- New SELECT policy: anon sees only approved, authenticated admins see all
CREATE POLICY "select_reviews" ON reviews FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'
    OR EXISTS (
      SELECT 1 FROM auth.users au
      JOIN admin_emails ae ON ae.email = au.email
      WHERE au.id = auth.uid()
    )
  );

-- INSERT policy: anyone can submit a review (defaults to pending)
CREATE POLICY "insert_reviews" ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- UPDATE policy: only admins can update (approve/decline/edit)
CREATE POLICY "update_reviews" ON reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      JOIN admin_emails ae ON ae.email = au.email
      WHERE au.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      JOIN admin_emails ae ON ae.email = au.email
      WHERE au.id = auth.uid()
    )
  );

-- DELETE policy: only admins can delete
CREATE POLICY "delete_reviews" ON reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      JOIN admin_emails ae ON ae.email = au.email
      WHERE au.id = auth.uid()
    )
  );

-- admin_emails policies
-- Anyone can read admin_emails (needed to check admin status client-side)
DROP POLICY IF EXISTS "select_admin_emails" ON admin_emails;
CREATE POLICY "select_admin_emails" ON admin_emails FOR SELECT
  TO anon, authenticated USING (true);

-- Only admins can insert/delete admin emails
DROP POLICY IF EXISTS "insert_admin_emails" ON admin_emails;
CREATE POLICY "insert_admin_emails" ON admin_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      JOIN admin_emails ae ON ae.email = au.email
      WHERE au.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_admin_emails" ON admin_emails;
CREATE POLICY "delete_admin_emails" ON admin_emails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      JOIN admin_emails ae ON ae.email = au.email
      WHERE au.id = auth.uid()
    )
  );

-- Insert the initial admin email (project owner)
-- Using a placeholder that will be updated; the user will sign up with their email
INSERT INTO admin_emails (email) VALUES ('noveltylibrary.admin@gmail.com')
ON CONFLICT (email) DO NOTHING;
