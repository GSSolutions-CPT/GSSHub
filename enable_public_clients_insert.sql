-- Enable RLS on the table (if not already enabled)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone (anon) to insert new clients
-- WARNING: This allows anyone with your Anon Key (public website) to create clients.
-- Ensure you have rate limiting or other protections in place if needed.
CREATE POLICY "Allow public inserts"
ON clients
FOR INSERT
TO anon
WITH CHECK (true);

-- Optional: Allow anon to read back the client they just created? 
-- Usually not needed for a simple "Contact Us" form, returns only the inserted row to the API.
-- If you need to verify the insert immediately in frontend:
-- CREATE POLICY "Allow public read of own inserts" ... (complex without user ID)
