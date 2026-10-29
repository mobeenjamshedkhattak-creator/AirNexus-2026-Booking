-- FIRST: Authentication > Users > Add user > Create new user.
-- Set an email and password. Enable Auto Confirm User if shown.
-- THEN replace the example email below with the SAME real email and click Run.
insert into public.an_organizers (user_id, email)
select id, email from auth.users
where lower(email) = lower('REPLACE-WITH-YOUR-EMAIL@au.edu.pk')
on conflict (user_id) do update set email = excluded.email;

-- Your approved email MUST appear in the result below.
select email, user_id from public.an_organizers order by email;

-- Add more organizers by changing the email above and running again.
-- To remove someone later, run (with their real email):
-- delete from public.an_organizers where lower(email) = lower('person@au.edu.pk');
