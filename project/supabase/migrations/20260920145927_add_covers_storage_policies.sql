/*
# Storage policies for covers bucket

Public read, authenticated write for cover image uploads.
*/

-- Public read policy
DROP POLICY IF EXISTS "covers_public_read" ON storage.objects;
CREATE POLICY "covers_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'covers');

-- Authenticated upload
DROP POLICY IF EXISTS "covers_auth_upload" ON storage.objects;
CREATE POLICY "covers_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers');

-- Authenticated update
DROP POLICY IF EXISTS "covers_auth_update" ON storage.objects;
CREATE POLICY "covers_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'covers');
