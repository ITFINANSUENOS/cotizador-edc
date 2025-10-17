-- Create table for discount ranges history
CREATE TABLE public.discount_ranges_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ranges JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  plan_type TEXT NOT NULL DEFAULT 'nuevo_modelo_credito'
);

-- Enable Row Level Security
ALTER TABLE public.discount_ranges_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage discount ranges history" 
ON public.discount_ranges_history 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view discount ranges history" 
ON public.discount_ranges_history 
FOR SELECT 
USING (true);

-- Create index for better performance
CREATE INDEX idx_discount_ranges_history_created_at ON public.discount_ranges_history(created_at DESC);