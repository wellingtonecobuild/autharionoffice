-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can create contact threads" ON public.communication_threads;
DROP POLICY IF EXISTS "Users can send messages in their threads" ON public.communication_messages;

-- Allow users to create internal threads (not just contact form)
CREATE POLICY "Users can create their own threads"
ON public.communication_threads
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND initiator_id = auth.uid()
  AND channel_type IN ('internal', 'contact_form', 'document_exchange')
);

-- Allow users to update their own threads (for last_message_at)
CREATE POLICY "Users can update their own threads"
ON public.communication_threads
FOR UPDATE
USING (initiator_id = auth.uid())
WITH CHECK (initiator_id = auth.uid());

-- Allow users to send messages in threads they initiated OR are participants of
CREATE POLICY "Users can send messages in their threads"
ON public.communication_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND (
    -- User is the initiator of the thread
    EXISTS (
      SELECT 1 FROM communication_threads t
      WHERE t.id = communication_messages.thread_id
      AND t.initiator_id = auth.uid()
    )
    OR
    -- User is a participant with reply permission
    EXISTS (
      SELECT 1 FROM communication_participants p
      WHERE p.thread_id = communication_messages.thread_id
      AND p.user_id = auth.uid()
      AND p.can_reply = true
    )
  )
);

-- Allow users to insert attachments on their own messages
CREATE POLICY "Users can add attachments to their messages"
ON public.communication_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM communication_messages m
    JOIN communication_threads t ON t.id = m.thread_id
    WHERE m.id = communication_attachments.message_id
    AND (t.initiator_id = auth.uid() OR m.sender_id = auth.uid())
  )
);