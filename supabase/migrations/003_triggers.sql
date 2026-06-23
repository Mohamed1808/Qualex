-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Phone normalization function
CREATE OR REPLACE FUNCTION normalize_egyptian_phone(phone TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Remove non-digit chars
  cleaned := regexp_replace(phone, '[^\d]', '', 'g');
  -- Handle different formats
  IF cleaned LIKE '20%' THEN
    RETURN '+' || cleaned;
  ELSIF cleaned LIKE '0%' THEN
    RETURN '+20' || substr(cleaned, 2);
  ELSE
    RETURN '+20' || cleaned;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Dedup check trigger
CREATE OR REPLACE FUNCTION check_lead_duplicate()
RETURNS TRIGGER AS $$
DECLARE
  normalized_phone TEXT;
  existing_lead_id UUID;
  channel_entry JSONB;
BEGIN
  -- Normalize phone
  normalized_phone := normalize_egyptian_phone(NEW.phone);
  NEW.phone_normalized := normalized_phone;

  -- Check for existing lead with same normalized phone
  SELECT id INTO existing_lead_id
  FROM leads
  WHERE phone_normalized = normalized_phone
    AND is_duplicate = false
    AND id != NEW.id
  LIMIT 1;

  IF existing_lead_id IS NOT NULL THEN
    -- Mark new lead as duplicate
    NEW.is_duplicate := true;
    NEW.duplicate_of := existing_lead_id;

    -- Build channel history entry
    channel_entry := jsonb_build_object(
      'channel', NEW.channel,
      'captured_at', now(),
      'source', NEW.source_campaign
    );

    -- Update channel history on original lead
    UPDATE leads
    SET channel_history = channel_history || channel_entry
    WHERE id = existing_lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_dedup_check BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION check_lead_duplicate();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'telesales_agent')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
