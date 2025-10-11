-- Habilitar RLS en todas las tablas públicas que lo necesiten
ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permissions
DROP POLICY IF EXISTS "Admins can view permissions" ON public.permissions;
CREATE POLICY "Admins can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions;
CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));