-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'advisor');

-- Create enum for sale plan types
CREATE TYPE public.sale_plan_type AS ENUM ('credicontado', 'credito', 'convenio');

-- User roles table (security best practice - roles in separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Advisors table (asesores)
CREATE TABLE public.advisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  sales_manager TEXT,
  zone_leader TEXT,
  zonal_coordinator TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;

-- Price lists table
CREATE TABLE public.price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  line TEXT NOT NULL,
  reference TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brand, line, reference)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Price list products (relation between products and price lists with prices)
CREATE TABLE public.price_list_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID REFERENCES public.price_lists(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  base_price DECIMAL(12,2) NOT NULL,
  credit_price DECIMAL(12,2),
  convenio_price DECIMAL(12,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(price_list_id, product_id)
);

ALTER TABLE public.price_list_products ENABLE ROW LEVEL SECURITY;

-- Sales plan configuration
CREATE TABLE public.sales_plan_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type sale_plan_type NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plan_type)
);

ALTER TABLE public.sales_plan_config ENABLE ROW LEVEL SECURITY;

-- Quotes table (to save generated quotes)
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID REFERENCES public.advisors(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  price_list_id UUID REFERENCES public.price_lists(id) NOT NULL,
  sale_type sale_plan_type NOT NULL,
  client_name TEXT NOT NULL,
  client_id_number TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  base_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  initial_payment DECIMAL(12,2) DEFAULT 0,
  remaining_balance DECIMAL(12,2) NOT NULL,
  installments INTEGER NOT NULL,
  monthly_payment DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- user_roles: Only admins can manage, users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- advisors: Admins can manage all, advisors can view their own
CREATE POLICY "Advisors can view their own profile"
  ON public.advisors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage advisors"
  ON public.advisors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- price_lists: Admins can manage, advisors can view active lists
CREATE POLICY "Users can view active price lists"
  ON public.price_lists FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage price lists"
  ON public.price_lists FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- products: Everyone can view, admins can manage
CREATE POLICY "Users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- price_list_products: Everyone can view, admins can manage
CREATE POLICY "Users can view price list products"
  ON public.price_list_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage price list products"
  ON public.price_list_products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- sales_plan_config: Everyone can view active configs, admins can manage
CREATE POLICY "Users can view active sales plan configs"
  ON public.sales_plan_config FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage sales plan configs"
  ON public.sales_plan_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- quotes: Users can view/create their own quotes, admins can view all
CREATE POLICY "Advisors can view their own quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.advisors
      WHERE advisors.id = quotes.advisor_id
      AND advisors.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Advisors can create quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.advisors
      WHERE advisors.id = quotes.advisor_id
      AND advisors.user_id = auth.uid()
    )
  );

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
CREATE TRIGGER update_advisors_updated_at
  BEFORE UPDATE ON public.advisors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_lists_updated_at
  BEFORE UPDATE ON public.price_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_plan_config_updated_at
  BEFORE UPDATE ON public.sales_plan_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sales plan configurations
INSERT INTO public.sales_plan_config (plan_type, config, is_active) VALUES
('credicontado', '{"available_installments": [2, 3, 4, 5, 6], "percentage_per_installment": {"2": 5, "3": 5, "4": 5, "5": 5, "6": 5}}'::jsonb, true),
('credito', '{"monthly_interest_rate": 2.5, "aval_cobrador_percentage": 1.5, "available_terms": [9, 11, 14, 17]}'::jsonb, true),
('convenio', '{"enabled": true}'::jsonb, true);