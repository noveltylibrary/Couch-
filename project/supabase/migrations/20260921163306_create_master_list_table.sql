/*
# Create master_list table for editable admin spreadsheet

1. New Tables
- `master_list`
  - `id` (uuid, primary key)
  - `review_no` (text) - review number from the sheet
  - `timestamp` (text) - original form submission timestamp
  - `name` (text) - reviewer name
  - `email` (text) - reviewer email
  - `contact_required` (text) - contact preference
  - `instagram` (text) - Instagram handle
  - `website` (text) - website URL
  - `book_title` (text) - title of the book
  - `author` (text) - book author
  - `genre` (text) - book genre
  - `series` (text) - series name if applicable
  - `book_number` (text) - book number in series
  - `language` (text) - language of the book
  - `translated_in` (text) - languages translated in
  - `reviewers_rating` (text) - reviewer's rating
  - `goodreads_rating` (text) - Goodreads rating
  - `amazon_rating` (text) - Amazon rating
  - `traits` (text) - book traits/tags
  - `book_cover` (text) - cover image URL
  - `review` (text) - full review text
  - `amazon_link` (text) - Amazon purchase link
  - `review_date` (text) - date of review
  - `heard_from` (text) - where reviewer heard about NL
  - `agreement` (text) - agreement status
  - `form_rating` (text) - form experience rating
  - `suggestions` (text) - reviewer suggestions
  - `status` (text) - review status (e.g. published, draft)
  - `blogger_draft` (text) - blogger draft link
  - `created_at` (timestamptz) - when row was created
  - `updated_at` (timestamptz) - when row was last updated

2. Security
- Enable RLS on `master_list`.
- Admin-only access: SELECT, INSERT, UPDATE, DELETE scoped to authenticated users whose email is in `admin_emails`.
*/
CREATE TABLE IF NOT EXISTS master_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_no text DEFAULT '',
  timestamp text DEFAULT '',
  name text DEFAULT '',
  email text DEFAULT '',
  contact_required text DEFAULT '',
  instagram text DEFAULT '',
  website text DEFAULT '',
  book_title text DEFAULT '',
  author text DEFAULT '',
  genre text DEFAULT '',
  series text DEFAULT '',
  book_number text DEFAULT '',
  language text DEFAULT '',
  translated_in text DEFAULT '',
  reviewers_rating text DEFAULT '',
  goodreads_rating text DEFAULT '',
  amazon_rating text DEFAULT '',
  traits text DEFAULT '',
  book_cover text DEFAULT '',
  review text DEFAULT '',
  amazon_link text DEFAULT '',
  review_date text DEFAULT '',
  heard_from text DEFAULT '',
  agreement text DEFAULT '',
  form_rating text DEFAULT '',
  suggestions text DEFAULT '',
  status text DEFAULT '',
  blogger_draft text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE master_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_master_list" ON master_list;
CREATE POLICY "admin_select_master_list"
ON master_list FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM admin_emails WHERE admin_emails.email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "admin_insert_master_list" ON master_list;
CREATE POLICY "admin_insert_master_list"
ON master_list FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM admin_emails WHERE admin_emails.email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "admin_update_master_list" ON master_list;
CREATE POLICY "admin_update_master_list"
ON master_list FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM admin_emails WHERE admin_emails.email = auth.jwt() ->> 'email'))
WITH CHECK (EXISTS (SELECT 1 FROM admin_emails WHERE admin_emails.email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "admin_delete_master_list" ON master_list;
CREATE POLICY "admin_delete_master_list"
ON master_list FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM admin_emails WHERE admin_emails.email = auth.jwt() ->> 'email'));

CREATE INDEX IF NOT EXISTS idx_master_list_book_title ON master_list (book_title);
CREATE INDEX IF NOT EXISTS idx_master_list_author ON master_list (author);
