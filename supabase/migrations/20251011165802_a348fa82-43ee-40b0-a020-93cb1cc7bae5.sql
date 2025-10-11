-- Segunda parte: Crear tablas y permisos

-- Tabla de permisos del sistema
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de permisos por rol
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Tabla de usuarios del equipo
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  document_id TEXT UNIQUE,
  phone TEXT,
  department TEXT,
  position TEXT,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can view all role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own team profile"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all team members"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage team members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar permisos básicos
INSERT INTO public.permissions (name, description) VALUES
('view_dashboard', 'Ver dashboard principal'),
('manage_advisors', 'Gestionar asesores'),
('manage_prices', 'Gestionar listas de precios'),
('manage_quotes', 'Gestionar cotizaciones'),
('view_reports', 'Ver reportes'),
('manage_team', 'Gestionar equipo'),
('manage_permissions', 'Gestionar permisos'),
('view_all_quotes', 'Ver todas las cotizaciones'),
('export_data', 'Exportar datos')
ON CONFLICT (name) DO NOTHING;

-- Asignar permisos a roles
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'comercial'::app_role, id FROM public.permissions 
WHERE name IN ('view_dashboard', 'manage_quotes', 'view_reports')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'cartera'::app_role, id FROM public.permissions 
WHERE name IN ('view_dashboard', 'view_all_quotes', 'view_reports', 'export_data')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'administrativo'::app_role, id FROM public.permissions 
WHERE name IN ('view_dashboard', 'view_reports', 'export_data')
ON CONFLICT DO NOTHING;

-- Funciones de validación de duplicados
CREATE OR REPLACE FUNCTION check_advisor_duplicates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM advisors 
      WHERE phone = NEW.phone 
      AND email != NEW.email 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Ya existe un asesor con el teléfono % pero diferente email', NEW.phone;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_advisor_duplicates_trigger ON public.advisors;
CREATE TRIGGER check_advisor_duplicates_trigger
  BEFORE INSERT OR UPDATE ON public.advisors
  FOR EACH ROW
  EXECUTE FUNCTION check_advisor_duplicates();

CREATE OR REPLACE FUNCTION check_team_member_duplicates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM team_members 
      WHERE document_id = NEW.document_id 
      AND full_name != NEW.full_name 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Ya existe un usuario con la cédula % pero diferente nombre: %', 
        NEW.document_id,
        (SELECT full_name FROM team_members WHERE document_id = NEW.document_id LIMIT 1);
    END IF;
  END IF;
  
  IF NEW.phone IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM team_members 
      WHERE phone = NEW.phone 
      AND email != NEW.email 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Ya existe un usuario con el teléfono % pero diferente email', NEW.phone;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_team_member_duplicates_trigger ON public.team_members;
CREATE TRIGGER check_team_member_duplicates_trigger
  BEFORE INSERT OR UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION check_team_member_duplicates();