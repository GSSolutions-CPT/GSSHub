-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Table: Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    category TEXT,
    retail_price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    image_url TEXT,
    metadata JSONB
);

-- Table: Quotations
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Draft', -- e.g., Draft, Sent, Approved, Rejected
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    total_amount NUMERIC(10, 2) NOT NULL,
    vat_applicable BOOLEAN DEFAULT FALSE,
    trade_subtotal NUMERIC(10, 2),
    profit_estimate NUMERIC(10, 2),
    metadata JSONB
);

-- Table: Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Draft', -- e.g., Draft, Sent, Paid, Overdue, Cancelled
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    total_amount NUMERIC(10, 2) NOT NULL,
    vat_applicable BOOLEAN DEFAULT FALSE,
    trade_subtotal NUMERIC(10, 2),
    profit_estimate NUMERIC(10, 2),
    metadata JSONB
);

-- Table: QuotationLines
CREATE TABLE quotation_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    line_total NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL
);

-- Table: InvoiceLines
CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    line_total NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL
);

-- Table: Jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    assigned_technicians TEXT[], -- Array of technician names/IDs
    scheduled_datetime TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Pending', -- e.g., Pending, In Progress, Completed, Cancelled
    notes TEXT,
    client_signature TEXT, -- Store as URL to image or base64 encoded string
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'job' or 'general'
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: ActivityLog
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT NOT NULL, -- e.g., 'Client Created', 'Quotation Approved', 'Job Completed'
    description TEXT NOT NULL,
    related_entity_id UUID, -- Generic ID for the entity (client, quote, job, etc.)
    related_entity_type TEXT, -- e.g., 'client', 'quotation', 'job'
    metadata JSONB
);

-- Table: CalendarEvents
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- e.g., 'Job', 'Invoice Due', 'Reminder'
    title TEXT NOT NULL,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    related_entity_id UUID, -- ID of the related entity (job, invoice, etc.)
    related_entity_type TEXT, -- e.g., 'job', 'invoice', 'recurring_contract'
    metadata JSONB
);

-- Table: Templates
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    template_type TEXT NOT NULL, -- 'quotation' or 'invoice'
    template_data JSONB NOT NULL, -- Store template structure/content as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: RecurringContracts
CREATE TABLE recurring_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    description TEXT,
    frequency TEXT NOT NULL, -- e.g., 'monthly', 'quarterly', 'annually'
    next_billing_date DATE NOT NULL,
    active_flag BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Users (for Role-Based Permissions)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'technician', -- e.g., 'admin', 'manager', 'technician', 'accountant'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: UserActivityLog (for audit trails specific to user actions)
CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT NOT NULL, -- e.g., 'login', 'client_created', 'invoice_updated'
    details JSONB, -- Store details of the action, e.g., old_value, new_value
    ip_address INET
);

-- Indexes for performance
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_quotations_client_id ON quotations(client(id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_quotation_id ON invoices(quotation_id);
CREATE INDEX idx_quotation_lines_quotation_id ON quotation_lines(quotation_id);
CREATE INDEX idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_quotation_id ON jobs(quotation_id);
CREATE INDEX idx_expenses_job_id ON expenses(job_id);
CREATE INDEX idx_expenses_invoice_id ON expenses(invoice_id);
CREATE INDEX idx_activity_log_related_entity ON activity_log(related_entity_id, related_entity_type);
CREATE INDEX idx_calendar_events_datetime ON calendar_events(datetime);
CREATE INDEX idx_recurring_contracts_client_id ON recurring_contracts(client_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_recurring_contracts_updated_at
BEFORE UPDATE ON recurring_contracts
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

