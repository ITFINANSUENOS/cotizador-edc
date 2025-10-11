-- Add end_date column to price_lists table
ALTER TABLE public.price_lists 
ADD COLUMN end_date date;