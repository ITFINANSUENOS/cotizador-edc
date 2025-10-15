-- Add retanqueo interest rate to credito config
-- This will store the specific interest rate for FS to FS refinancing

-- Update existing credito config to include retanqueo rate (1.60%)
UPDATE sales_plan_config
SET config = config || '{"retanqueo_interest_rate": 1.60}'::jsonb
WHERE plan_type = 'credito';

-- Allow sales managers (jefes de ventas) to also be advisors and quote
-- No schema changes needed, just ensure RLS policies support hierarchical access

-- Update quotes RLS policy to allow hierarchical viewing
DROP POLICY IF EXISTS "Advisors can view their own quotes" ON quotes;

CREATE POLICY "Advisors can view their own quotes"
ON quotes
FOR SELECT
USING (
  -- Own quotes
  EXISTS (
    SELECT 1 FROM advisors
    WHERE advisors.id = quotes.advisor_id
    AND advisors.user_id = auth.uid()
  )
  OR
  -- Quotes from advisors under their management (by sales_manager field)
  EXISTS (
    SELECT 1 FROM advisors my_advisor
    JOIN advisors team_advisor ON team_advisor.sales_manager = my_advisor.full_name
    WHERE my_advisor.user_id = auth.uid()
    AND team_advisor.id = quotes.advisor_id
  )
  OR
  -- Admins can see all
  has_role(auth.uid(), 'admin'::app_role)
);