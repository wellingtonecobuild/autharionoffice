-- Add DELETE policy for admins on revenue_transactions table
CREATE POLICY "Admins can delete revenue transactions"
ON public.revenue_transactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));