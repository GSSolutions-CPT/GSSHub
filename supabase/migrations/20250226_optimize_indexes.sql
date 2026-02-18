-- Database Index Optimization
-- Based on slow query logs: 2025-02-26

-- 1. Invoices
-- Queries often order by date_created DESC.
CREATE INDEX IF NOT EXISTS idx_invoices_date_created ON public.invoices (date_created DESC);

-- Queries filtering by client_id AND ordering by date_created DESC.
-- Drop old single-column index if it exists to replace with composite.
DROP INDEX IF EXISTS idx_invoices_client_id;
CREATE INDEX IF NOT EXISTS idx_invoices_client_date_created ON public.invoices (client_id, date_created DESC);


-- 2. Quotations
-- Queries often order by date_created DESC.
CREATE INDEX IF NOT EXISTS idx_quotations_date_created ON public.quotations (date_created DESC);

-- Queries filtering by client_id AND ordering by date_created DESC.
DROP INDEX IF EXISTS idx_quotations_client_id;
CREATE INDEX IF NOT EXISTS idx_quotations_client_date_created ON public.quotations (client_id, date_created DESC);


-- 3. Jobs
-- Queries often order by created_at DESC (logs show created_at for jobs).
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs (created_at DESC);

-- Queries filtering by client_id AND ordering by created_at DESC.
DROP INDEX IF EXISTS idx_jobs_client_id;
CREATE INDEX IF NOT EXISTS idx_jobs_client_created_at ON public.jobs (client_id, created_at DESC);
