-- Add UPDATE and DELETE policies for quotes table
-- Allows advisors to modify/delete their recent quotes and admins to manage all quotes

CREATE POLICY "Advisors can update their recent quotes"
ON quotes FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM advisors
    WHERE advisors.id = quotes.advisor_id
    AND advisors.user_id = auth.uid()
  ) AND created_at > now() - interval '24 hours')
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Advisors can delete their recent quotes"
ON quotes FOR DELETE
USING (
  (EXISTS (
    SELECT 1 FROM advisors
    WHERE advisors.id = quotes.advisor_id
    AND advisors.user_id = auth.uid()
  ) AND created_at > now() - interval '24 hours')
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Improve quotes SELECT policy to restrict team visibility to managers only
DROP POLICY IF EXISTS "Advisors can view their own quotes" ON quotes;

CREATE POLICY "Advisors and managers can view quotes"
ON quotes FOR SELECT
USING (
  -- Advisors can view their own quotes
  (EXISTS (
    SELECT 1 FROM advisors
    WHERE advisors.id = quotes.advisor_id
    AND advisors.user_id = auth.uid()
  ))
  OR
  -- Managers can view their team's quotes (must have manager role)
  (EXISTS (
    SELECT 1
    FROM advisors manager
    JOIN advisors report ON (report.sales_manager = manager.full_name)
    WHERE manager.user_id = auth.uid()
    AND report.id = quotes.advisor_id
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin')
    )
  ))
  OR
  -- Admins can view all
  has_role(auth.uid(), 'admin'::app_role)
);