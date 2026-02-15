-- Migration: Create Installation Details Tables
-- Description: Add tables for tracking installation photos and serial numbers linked to invoices

-- Table: installation_details
-- Stores main installation record with serial numbers and notes
CREATE TABLE IF NOT EXISTS installation_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  serial_numbers JSONB DEFAULT '[]'::jsonb, -- Array of {component: string, serial: string}
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by invoice
CREATE INDEX IF NOT EXISTS idx_installation_details_invoice ON installation_details(invoice_id);

-- Table: installation_photos
-- Stores multiple photos for each installation detail record
CREATE TABLE IF NOT EXISTS installation_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installation_detail_id UUID REFERENCES installation_details(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by installation detail
CREATE INDEX IF NOT EXISTS idx_installation_photos_detail ON installation_photos(installation_detail_id);

-- Enable Row Level Security
ALTER TABLE installation_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for installation_details
CREATE POLICY "Authenticated users can insert installation details"
ON installation_details FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view installation details"
ON installation_details FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update installation details"
ON installation_details FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete installation details"
ON installation_details FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for installation_photos
CREATE POLICY "Authenticated users can insert photos"
ON installation_photos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view photos"
ON installation_photos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete photos"
ON installation_photos FOR DELETE
TO authenticated
USING (true);

-- Storage bucket policies (run these in Supabase Dashboard SQL Editor after creating bucket)
-- Note: First create the bucket 'installation-photos' in Storage UI, then run these:

-- Allow authenticated users to upload
-- CREATE POLICY "Authenticated users can upload installation photos"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'installation-photos');

-- Allow public read access
-- CREATE POLICY "Public can view installation photos"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'installation-photos');

-- Allow authenticated users to delete their uploads
-- CREATE POLICY "Authenticated users can delete installation photos"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'installation-photos');
