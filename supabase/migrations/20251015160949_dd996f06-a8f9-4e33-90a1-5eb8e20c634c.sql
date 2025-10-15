-- Update RLS policy to allow sales managers (jefes de ventas) to create quotes
-- First, drop the existing policy
DROP POLICY IF EXISTS "Advisors can create quotes" ON quotes;

-- Create new policy that allows both advisors and sales managers to create quotes
CREATE POLICY "Advisors and sales managers can create quotes"
ON quotes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM advisors
    WHERE advisors.id = quotes.advisor_id
    AND advisors.user_id = auth.uid()
  )
);

-- Update the SELECT policy to include cascading access for zone leaders, coordinators, and sales managers
DROP POLICY IF EXISTS "Advisors and managers can view quotes" ON quotes;

CREATE POLICY "Users can view quotes based on role"
ON quotes
FOR SELECT
TO authenticated
USING (
  -- Admin can see all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Advisor can see their own quotes
  EXISTS (
    SELECT 1 FROM advisors
    WHERE advisors.id = quotes.advisor_id
    AND advisors.user_id = auth.uid()
  )
  OR
  -- Zone leader can see quotes from advisors under them
  EXISTS (
    SELECT 1 FROM advisors user_advisor
    JOIN advisors report_advisor ON report_advisor.zone_leader = user_advisor.full_name
    WHERE user_advisor.user_id = auth.uid()
    AND report_advisor.id = quotes.advisor_id
  )
  OR
  -- Zonal coordinator can see quotes from advisors under them
  EXISTS (
    SELECT 1 FROM advisors user_advisor
    JOIN advisors report_advisor ON report_advisor.zonal_coordinator = user_advisor.full_name
    WHERE user_advisor.user_id = auth.uid()
    AND report_advisor.id = quotes.advisor_id
  )
  OR
  -- Sales manager can see quotes from advisors assigned to them
  EXISTS (
    SELECT 1 FROM advisors user_advisor
    JOIN advisors report_advisor ON report_advisor.sales_manager = user_advisor.full_name
    WHERE user_advisor.user_id = auth.uid()
    AND report_advisor.id = quotes.advisor_id
  )
);