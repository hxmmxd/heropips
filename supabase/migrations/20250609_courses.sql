-- Courses table for YouTube video tutorials managed from Admin panel
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  duration TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster public queries
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses (is_published, category, order_index);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Public read for published courses
CREATE POLICY "Public can read published courses"
  ON courses FOR SELECT
  USING (is_published = true);

-- Admin full access (via service role key, bypasses RLS)
