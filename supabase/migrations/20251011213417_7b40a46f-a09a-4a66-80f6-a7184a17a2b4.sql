-- Actualizar la estructura de price_list_products para manejar las 4 listas de precios de contado
-- más los precios especiales de credicontado, crédito y convenios

ALTER TABLE price_list_products 
  DROP COLUMN IF EXISTS base_price,
  DROP COLUMN IF EXISTS credit_price,
  DROP COLUMN IF EXISTS convenio_price;

ALTER TABLE price_list_products
  ADD COLUMN list_1_price numeric,
  ADD COLUMN list_2_price numeric,
  ADD COLUMN list_3_price numeric,
  ADD COLUMN list_4_price numeric,
  ADD COLUMN credicontado_price numeric,
  ADD COLUMN credit_price numeric,
  ADD COLUMN convenio_price numeric;