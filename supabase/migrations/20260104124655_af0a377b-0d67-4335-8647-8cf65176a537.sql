-- Enable realtime for communication tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_messages;