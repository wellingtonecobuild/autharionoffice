-- Add DELETE policy for communication_audit_log
CREATE POLICY "Admins can delete audit logs" 
ON public.communication_audit_log 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Ensure all communication tables have proper admin policies for all operations
-- Drop and recreate more permissive admin policies that cover ALL operations including DELETE

-- For communication_audit_log - add missing UPDATE policy
CREATE POLICY "Admins can update audit logs" 
ON public.communication_audit_log 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));