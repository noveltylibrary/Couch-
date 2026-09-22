/*
# Add review_number and novelty_username columns

- reviews.review_number: sequential number from the Google Sheet
- profiles.novelty_username: derived from email (everything before @gmail.com)
- reviews.reviewer_name: display name of the reviewer
- reviews.reviewer_email: email (for admin use)
*/

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_number integer;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_email text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS novelty_username text;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS novelty_username text
  GENERATED ALWAYS AS (
    CASE
      WHEN email LIKE '%@gmail.com' THEN split_part(email, '@', 1)
      WHEN email LIKE '%@%' THEN split_part(email, '@', 1)
      ELSE email
    END
  ) STORED;
