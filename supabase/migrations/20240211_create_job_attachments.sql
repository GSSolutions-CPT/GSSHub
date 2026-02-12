-- Create job_attachments table
CREATE TABLE IF NOT EXISTS public.job_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Establish RLS policies for job_attachments
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.job_attachments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.job_attachments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.job_attachments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.job_attachments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create storage bucket for job-attachments if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('job-attachments', 'job-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'job-attachments' );
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'job-attachments' AND auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'job-attachments' AND auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'job-attachments' AND auth.role() = 'authenticated' );
