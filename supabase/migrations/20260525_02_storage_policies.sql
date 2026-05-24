-- Storage RLS policies for avatars bucket
-- Allow authenticated users to upload their own avatar
create policy "Users can upload own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own avatar
create policy "Users can update own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to read avatars (public bucket)
create policy "Anyone can view avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- Allow users to delete their own avatar
create policy "Users can delete own avatar"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
