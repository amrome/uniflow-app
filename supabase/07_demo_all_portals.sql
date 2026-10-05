-- =====================================================================
-- Patch 07 (demo helper): ONE account that can open every portal.
--
--   Normal Login            -> student portal
--   Staff login + any chip  -> university admin / instructor (Sarah) / club admin (GDG)
--   (Guest is separate: "Continue as Guest" makes a throwaway anonymous account.)
--
-- Steps:
--   1. Authentication > Users > Add user (an @yu.edu.sa email, tick "Auto Confirm User").
--   2. Put that email below (v_email) and run this file in the SQL Editor.
-- Safe to run again. For a real launch, remove the extra roles from this account.
-- =====================================================================

do $$
declare
  v_email text := 'demo@yu.edu.sa';        -- <- the account you created
  v_id    uuid;
begin
  select id into v_id from public.profiles where lower(email) = lower(v_email);
  if v_id is null then
    raise exception 'No profile for %. Create the user in Authentication > Users first.', v_email;
  end if;

  -- university admin
  update public.profiles set role = 'admin' where id = v_id;

  -- instructor: take over Sarah's portal
  update public.instructors set profile_id = null where profile_id = v_id;
  update public.instructors set profile_id = v_id where slug = 'sarah';

  -- club admin of GDG
  insert into public.club_members (club_id, user_id, role)
  select id, v_id, 'admin' from public.clubs where slug = 'gdg'
  on conflict (club_id, user_id) do update set role = 'admin';
end $$;
