-- Enable Realtime for the appointments table so the admin panel
-- receives postgres_changes events when customers book.
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
