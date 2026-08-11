-- Add blog fields to bento_cards if they don't exist
ALTER TABLE bento_cards
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS content text;
