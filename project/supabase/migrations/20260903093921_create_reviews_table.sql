/*
# Create book reviews table (single-tenant, no auth)

1. New Tables
- `reviews`
  - `id` (uuid, primary key)
  - `slug` (text, unique, not null) — URL-friendly identifier
  - `title` (text, not null) — book title
  - `author` (text, not null) — book author
  - `genre` (text, not null) — primary genre
  - `traits` (text) — comma-separated thematic traits
  - `language` (text, default 'English') — book language
  - `review_text` (text, not null) — full review body
  - `rw_rating` (numeric, not null) — Novelty Library R/W rating out of 10
  - `goodreads_rating` (numeric) — Goodreads community rating out of 5
  - `reviewer_handle` (text) — reviewer's Instagram handle
  - `cover_image_url` (text) — book cover image URL
  - `buy_link` (text) — affiliate purchase link
  - `labels` (text[]) — tags/categories for the review
  - `published_at` (date, not null) — date the review was published
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Indexes
- Index on `slug` for fast lookups (unique constraint already indexes this)
- Index on `genre` for filtering
- Index on `published_at` desc for chronological listing

3. Security
- Enable RLS on `reviews`.
- Allow anon + authenticated SELECT (public reviews, no sign-in needed).
- Allow anon + authenticated INSERT (anyone can submit a review).
- No UPDATE or DELETE from the client — submissions are managed via admin tools.
*/

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  genre text NOT NULL,
  traits text,
  language text NOT NULL DEFAULT 'English',
  review_text text NOT NULL,
  rw_rating numeric NOT NULL,
  goodreads_rating numeric,
  reviewer_handle text,
  cover_image_url text,
  buy_link text,
  labels text[] DEFAULT '{}',
  published_at date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_genre ON reviews(genre);
CREATE INDEX IF NOT EXISTS idx_reviews_published_at ON reviews(published_at DESC);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reviews" ON reviews;
CREATE POLICY "anon_select_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;
CREATE POLICY "anon_insert_reviews" ON reviews FOR INSERT
  TO anon, authenticated WITH CHECK (true);
