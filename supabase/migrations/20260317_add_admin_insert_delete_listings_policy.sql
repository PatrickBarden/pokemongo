-- Allow admins to create listings on behalf of any user
CREATE POLICY "Admins can create any listing"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to delete any listing (needed for rollback on account listing creation)
CREATE POLICY "Admins can delete any listing"
  ON public.listings FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
