-- Allow any authenticated user to view basic public info of all users
-- This is needed for marketplace seller info, review display, etc.
-- Without this, PostgREST treats the owner:owner_id join as INNER JOIN
-- (because owner_id is NOT NULL) and drops listing rows when the
-- users RLS blocks access to the owner row.
CREATE POLICY "Authenticated users can view public user info"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);
