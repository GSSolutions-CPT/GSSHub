
-- Secure function to link a user to their client profile
CREATE OR REPLACE FUNCTION claim_client_profile(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Only allow if the profile is currently unclaimed
  UPDATE clients
  SET auth_user_id = auth.uid()
  WHERE id = p_client_id
  AND auth_user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile already claimed or not found';
  END IF;
END;
$$;
