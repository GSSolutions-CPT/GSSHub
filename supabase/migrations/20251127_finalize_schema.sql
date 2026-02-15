-- =============================================================================
-- GSSHub: Finalize Database Schema
-- Run this migration in Supabase SQL Editor
-- =============================================================================

-- 1. Job Attachments Table
-- Stores photos, documents, and other files attached to jobs
CREATE TABLE IF NOT EXISTS public.job_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_name TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Client Requests Table (for Portal)
-- Allows clients to request quotes or site visits through the portal
CREATE TABLE IF NOT EXISTS public.client_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'quote' or 'site_visit'
    description TEXT,
    address TEXT,
    preferred_date DATE,
    status TEXT DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security on new tables
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — Allow all access for authenticated users
CREATE POLICY "Allow all access for authenticated users" ON public.job_attachments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access for authenticated users" ON public.client_requests FOR ALL USING (auth.role() = 'authenticated');
