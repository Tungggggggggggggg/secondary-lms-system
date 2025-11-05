-- Bucket creation and RLS policies for file-based essay submissions

-- Create private bucket (idempotent)
select storage.create_bucket('lms-submissions', public := false);

-- Helper function to verify that path belongs to the authenticated user
create or replace function public.is_submission_owner(path text, uid uuid)
returns boolean language sql immutable as $$
  -- path format: submissions/{assignmentId}/{studentId}/{uuid}-{name}
  select split_part(path, '/', 3) = uid::text;
$$;

-- Allow authenticated users to insert into their own folder
create policy if not exists "students can upload their files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lms-submissions'
    and (storage.foldername(name))[1] = 'submissions'
    and public.is_submission_owner(name, auth.uid())
  );

-- Allow authenticated select; app will use signed URLs for access enforcement
create policy if not exists "app reads via signed URLs"
  on storage.objects for select to authenticated
  using (bucket_id = 'lms-submissions');


