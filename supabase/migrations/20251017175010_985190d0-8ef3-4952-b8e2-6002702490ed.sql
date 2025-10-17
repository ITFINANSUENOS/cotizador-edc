-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'contacto@finansuenos.com'
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Super admin can update discount ranges history" ON public.discount_ranges_history;
DROP POLICY IF EXISTS "Super admin can delete discount ranges history" ON public.discount_ranges_history;

-- Recreate policies using the new function
CREATE POLICY "Super admin can update discount ranges history"
ON public.discount_ranges_history
FOR UPDATE
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admin can delete discount ranges history"
ON public.discount_ranges_history
FOR DELETE
TO authenticated
USING (public.is_super_admin());