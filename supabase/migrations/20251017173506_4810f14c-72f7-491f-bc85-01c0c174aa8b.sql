-- Drop existing ALL policy for discount_ranges_history
DROP POLICY IF EXISTS "Admins can manage discount ranges history" ON public.discount_ranges_history;

-- Recreate SELECT policy for admins
CREATE POLICY "Admins can insert discount ranges history"
ON public.discount_ranges_history
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create super admin only policies for UPDATE and DELETE
CREATE POLICY "Super admin can update discount ranges history"
ON public.discount_ranges_history
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'contacto@finansuenos.com'
  )
);

CREATE POLICY "Super admin can delete discount ranges history"
ON public.discount_ranges_history
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'contacto@finansuenos.com'
  )
);