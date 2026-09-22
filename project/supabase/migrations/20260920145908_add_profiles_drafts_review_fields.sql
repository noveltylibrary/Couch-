/*
# Add profile table, review fields, and drafts

## Summary
Adds user profiles, new review columns for series/translated/amazon rating/
review date/heard-from/rating-buttons/undertaking, and a drafts table for
save/load draft functionality.

## 1. New Tables
- profiles (id, instagram_id, name, email, timestamps)
- review_drafts (id, user_id, draft_data jsonb, timestamps)

## 2. New Columns on reviews
- series_name, series_number, translated_from, amazon_rating,
  review_date, heard_from, rating_integer, undertaking_accepted, cover_storage_path

## 3. Security
- profiles: users read/update own only
- review_drafts: users CRUD own only
- Auto-create profile on signup via trigger
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_id text,
  name text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Review drafts table
CREATE TABLE IF NOT EXISTS review_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE review_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_drafts" ON review_drafts;
CREATE POLICY "select_own_drafts" ON review_drafts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_drafts" ON review_drafts;
CREATE POLICY "insert_own_drafts" ON review_drafts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_drafts" ON review_drafts;
CREATE POLICY "update_own_drafts" ON review_drafts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_drafts" ON review_drafts;
CREATE POLICY "delete_own_drafts" ON review_drafts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Add new columns to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS series_name text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS series_number integer;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS translated_from text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS amazon_rating numeric;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_date date;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS heard_from text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_integer integer;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS undertaking_accepted boolean NOT NULL DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS cover_storage_path text;

-- Update insert policy to require authenticated + profile for submissions
-- Keep anon insert for now but we'll enforce profile check in the app
