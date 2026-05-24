-- Add DELETE policy for admin notifications
CREATE POLICY "Admins can delete notifications" 
ON public.admin_notifications 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));