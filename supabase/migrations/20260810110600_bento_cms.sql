-- Create bento_cards table
CREATE TABLE IF NOT EXISTS public.bento_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    tag_text TEXT NOT NULL,
    tag_color TEXT NOT NULL DEFAULT 'purple',
    link_text TEXT,
    link_url TEXT,
    image_url TEXT,
    card_type TEXT NOT NULL DEFAULT 'standard',
    bento_size TEXT NOT NULL DEFAULT 'square-mid',
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bento_cards ENABLE ROW LEVEL SECURITY;

-- Public can read published cards
CREATE POLICY "Public can view published bento cards" ON public.bento_cards
    FOR SELECT USING (is_published = true);

-- Authenticated users can manage all cards (for admin access in MVP)
CREATE POLICY "Authenticated users can manage bento cards" ON public.bento_cards
    FOR ALL
    TO authenticated
    USING (true)
    
    WITH CHECK (true);

-- Create storage bucket for bento images
INSERT INTO storage.buckets (id, name, public) VALUES ('bento_images', 'bento_images', true) ON CONFLICT DO NOTHING;

-- Storage RLS policies for bento_images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Users can upload bento images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bento_images');

-- Allow authenticated users to update images
CREATE POLICY "Users can update bento images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bento_images');

-- Allow anyone to read images (public bucket)
CREATE POLICY "Anyone can view bento images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bento_images');

-- Allow authenticated users to delete images
CREATE POLICY "Users can delete bento images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bento_images');
