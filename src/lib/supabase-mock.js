// Minimal in-memory Supabase stub so the front-end can run without the actual SDK.
// It implements the subset of the client API used throughout the app (select, insert,
// update, eq, gte, lte, not, order, limit, single). The data below provides sensible demo
// defaults that match what the UI expects to render.

const dataStore = createInitialData();
const idCounters = Object.fromEntries(
  Object.entries(dataStore).map(([table, rows]) => [table, rows.length]),
);

class TableApi {
  constructor(table) {
    this.table = table;
  }

  select(columns = '*') {
    return new SelectQuery(this.table, columns);
  }

  insert(rows) {
    return new InsertQuery(this.table, Array.isArray(rows) ? rows : [rows]);
  }

  update(values) {
    return new UpdateQuery(this.table, values);
  }

  delete() {
    return new DeleteQuery(this.table);
  }
}

class SelectQuery {
  constructor(table, columns) {
    this.table = table;
    this.columns = columns;
    this.filters = [];
    this.ordering = null;
    this.limitCount = null;
    this.expectSingle = false;
  }

  eq(column, value) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lte(column, value) {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  not(column, operator, value) {
    this.filters.push({ column, operator: 'not', compareOperator: operator, value });
    return this;
  }

  order(column, options = {}) {
    const ascending = options.ascending !== false;
    this.ordering = { column, ascending };
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.expectSingle = true;
    return this;
  }

  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }

  async exec() {
    let rows = getCollection(this.table).map((row) => hydrateRow(this.table, row));

    if (this.filters.length) {
      rows = rows.filter((row) => this.filters.every((filter) => applyFilter(row, filter)));
    }

    if (this.ordering) {
      const { column, ascending } = this.ordering;
      rows = [...rows].sort((a, b) => {
        const comparison = compareValues(a[column], b[column]);
        return ascending ? comparison : -comparison;
      });
    }

    if (typeof this.limitCount === 'number') {
      rows = rows.slice(0, this.limitCount);
    }

    if (this.expectSingle) {
      const single = rows[0] ?? null;
      return {
        data: single,
        error: single ? null : { message: 'No matching rows', code: 'PGRST116' },
      };
    }

    return { data: rows, error: null };
  }
}

class InsertQuery {
  constructor(table, rows) {
    this.table = table;
    this.rows = rows.map((row) => deepClone(row));
    this.executed = false;
    this.cachedResult = null;
  }

  select() {
    return this._execute(true);
  }

  then(onFulfilled, onRejected) {
    return this._execute(false).then(onFulfilled, onRejected);
  }

  _execute(returnData) {
    if (!this.executed) {
      const collection = getCollection(this.table);
      const inserted = this.rows.map((row) => prepareRecordForInsert(this.table, row));
      collection.push(...inserted);
      this.cachedResult = inserted.map((row) => hydrateRow(this.table, row));
      this.executed = true;
    }

    if (returnData) {
      return Promise.resolve({ data: this.cachedResult, error: null });
    }

    return Promise.resolve({ data: this.cachedResult, error: null });
  }
}

class UpdateQuery {
  constructor(table, values) {
    this.table = table;
    this.values = deepClone(values);
    this.filters = [];
  }

  eq(column, value) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lte(column, value) {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }

  async exec() {
    const collection = getCollection(this.table);
    const updated = [];

    for (let index = 0; index < collection.length; index += 1) {
      const row = collection[index];
      if (this.filters.length && !this.filters.every((filter) => applyFilter(row, filter))) {
        continue;
      }

      const nextRow = {
        ...deepClone(row),
        ...deepClone(this.values),
        updated_at: new Date().toISOString(),
      };

      collection[index] = nextRow;
      updated.push(hydrateRow(this.table, nextRow));
    }

    return { data: updated, error: null };
  }
}

class DeleteQuery {
  constructor(table) {
    this.table = table;
    this.filters = [];
  }

  eq(column, value) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lte(column, value) {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }

  async exec() {
    const collection = getCollection(this.table);

    // Find indices to remove
    const indicesToRemove = [];
    for (let i = 0; i < collection.length; i++) {
      const row = collection[i];
      if (this.filters.every((filter) => applyFilter(row, filter))) {
        indicesToRemove.push(i);
      }
    }

    // Remove in reverse order to maintain indices
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      collection.splice(indicesToRemove[i], 1);
    }

    return { data: null, error: null, count: indicesToRemove.length };
  }
}

export const supabase = {
  from(table) {
    return new TableApi(table);
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    signInWithPassword: ({ email }) => {
      // Create a fake session for testing
      const session = {
        user: { id: 'mock-user-id', email },
        access_token: 'mock-token',
      }
      return Promise.resolve({ data: { session, user: session.user }, error: null })
    },
    signOut: () => Promise.resolve({ error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  },
  storage: {
    from: (bucket) => ({
      upload: (path) => {
        // Simulate upload delay
        return new Promise((resolve) => {
          setTimeout(() => {
            // In a real app this would upload to minimal storage
            // For mock, we'll return a fake path or use a blob URL if we could, 
            // but here we just return success. The UI will likely use a local preview.
            resolve({ data: { path }, error: null })
          }, 500)
        })
      },
      getPublicUrl: (path) => {
        // In a real app this returns the public URL
        // For mock, we can try to return a data URI if we had the file content,
        // but since we only have the path here, we'll return a placeholder or 
        // the client has to handle the preview separately.
        // However, to make the preview persistent in the session (if using URL.createObjectURL in UI),
        // we might not need this to return a real valid URL for the mock unless we store the blob.
        // Let's simluate a success struct.
        return { data: { publicUrl: `https://mock-storage.com/${bucket}/${path}` } }
      }
    })
  }
};

function getCollection(table) {
  if (!dataStore[table]) {
    dataStore[table] = [];
    idCounters[table] = 0;
  }
  return dataStore[table];
}

function createInitialData() {
  const iso = (date) => new Date(date).toISOString();

  return {
    clients: [
      {
        id: 'client-1',
        name: 'Acme Facilities',
        company: 'Acme Facilities',
        email: 'info@acmefacilities.com',
        phone: '+1 555 123 4567',
        address: '120 Industrial Way, Springfield',
        created_at: iso('2025-08-12T09:30:00Z'),
      },
      {
        id: 'client-2',
        name: 'Northwind Traders',
        company: 'Northwind Traders',
        email: 'support@northwind.com',
        phone: '+1 555 987 6543',
        address: '44 Market Street, Capital City',
        created_at: iso('2025-09-05T14:10:00Z'),
      },
      {
        id: 'client-3',
        name: 'Globex Construction',
        company: 'Globex Construction',
        email: 'projects@globex.co',
        phone: '+1 555 321 7890',
        address: '88 Skyline Ave, Metropolis',
        created_at: iso('2025-09-20T11:45:00Z'),
      },
    ],
    products: [
      {
        id: 'product-1',
        name: 'HVAC Maintenance Plan',
        code: 'HVAC-001',
        category: 'Services',
        retail_price: 1800,
        cost_price: 1100,
        description: 'Quarterly HVAC maintenance including filter replacements and systems diagnostics.',
        created_at: iso('2025-08-01T10:00:00Z'),
      },
      {
        id: 'product-2',
        name: 'Electrical Safety Inspection',
        code: 'ELEC-305',
        category: 'Inspections',
        retail_price: 950,
        cost_price: 450,
        description: 'Comprehensive electrical system inspection for commercial buildings.',
        created_at: iso('2025-08-18T12:30:00Z'),
      },
      {
        id: 'product-3',
        name: 'Facility Management Software',
        code: 'SaaS-201',
        category: 'Software',
        retail_price: 2400,
        cost_price: 900,
        description: 'Annual subscription to BizFlow facility management platform.',
        created_at: iso('2025-09-02T08:50:00Z'),
      },
      {
        id: 'product-4',
        name: 'Emergency Call-Out',
        code: 'EM-911',
        category: 'Support',
        retail_price: 350,
        cost_price: 120,
        description: 'Rapid response emergency call-out service for critical incidents.',
        created_at: iso('2025-09-25T16:15:00Z'),
      },
    ],
    quotations: [
      {
        id: 'quotation-1',
        client_id: 'client-1',
        status: 'Approved',
        date_created: iso('2025-08-25T09:00:00Z'),
        valid_until: '2025-10-25',
        total_amount: 5400,
        vat_applicable: true,
        trade_subtotal: 3600,
        profit_estimate: 1800,
      },
      {
        id: 'quotation-2',
        client_id: 'client-2',
        status: 'Sent',
        date_created: iso('2025-09-28T15:15:00Z'),
        valid_until: '2025-11-01',
        total_amount: 2800,
        vat_applicable: false,
        trade_subtotal: 1900,
        profit_estimate: 900,
      },
      {
        id: 'quotation-3',
        client_id: 'client-3',
        status: 'Draft',
        date_created: iso('2025-10-10T10:45:00Z'),
        valid_until: '2025-11-15',
        total_amount: 3900,
        vat_applicable: true,
        trade_subtotal: 2400,
        profit_estimate: 1500,
      },
    ],
    quotation_lines: [
      {
        id: 'ql-1',
        quotation_id: 'quotation-1',
        product_id: 'product-1',
        quantity: 2,
        unit_price: 1800,
        line_total: 3600,
        cost_price: 1100,
      },
      {
        id: 'ql-2',
        quotation_id: 'quotation-1',
        product_id: 'product-4',
        quantity: 3,
        unit_price: 600,
        line_total: 1800,
        cost_price: 300,
      },
      {
        id: 'ql-3',
        quotation_id: 'quotation-2',
        product_id: 'product-2',
        quantity: 2,
        unit_price: 950,
        line_total: 1900,
        cost_price: 450,
      },
      {
        id: 'ql-4',
        quotation_id: 'quotation-3',
        product_id: 'product-3',
        quantity: 1,
        unit_price: 2400,
        line_total: 2400,
        cost_price: 900,
      },
    ],
    invoices: [
      {
        id: 'invoice-1',
        client_id: 'client-1',
        quotation_id: 'quotation-1',
        status: 'Paid',
        date_created: iso('2025-09-05T11:00:00Z'),
        due_date: '2025-09-20',
        total_amount: 5400,
        deposit_amount: 0,
        vat_applicable: true,
        trade_subtotal: 3600,
        profit_estimate: 1800,
      },
      {
        id: 'invoice-2',
        client_id: 'client-2',
        quotation_id: 'quotation-2',
        status: 'Overdue',
        date_created: iso('2025-09-18T09:30:00Z'),
        due_date: '2025-10-05',
        total_amount: 2800,
        vat_applicable: false,
        trade_subtotal: 1900,
        profit_estimate: 900,
      },
      {
        id: 'invoice-3',
        client_id: 'client-3',
        quotation_id: null,
        status: 'Draft',
        date_created: iso('2025-10-07T13:10:00Z'),
        due_date: '2025-10-28',
        total_amount: 3200,
        vat_applicable: true,
        trade_subtotal: 2100,
        profit_estimate: 1100,
      },
    ],
    invoice_lines: [
      {
        id: 'il-1',
        invoice_id: 'invoice-1',
        product_id: 'product-1',
        quantity: 2,
        unit_price: 1800,
        line_total: 3600,
        cost_price: 1100,
      },
      {
        id: 'il-2',
        invoice_id: 'invoice-1',
        product_id: 'product-4',
        quantity: 3,
        unit_price: 600,
        line_total: 1800,
        cost_price: 300,
      },
      {
        id: 'il-3',
        invoice_id: 'invoice-2',
        product_id: 'product-2',
        quantity: 2,
        unit_price: 950,
        line_total: 1900,
        cost_price: 450,
      },
    ],
    jobs: [
      {
        id: 'job-1',
        client_id: 'client-1',
        quotation_id: 'quotation-1',
        status: 'Pending',
        assigned_technicians: ['Alex Johnson'],
        scheduled_datetime: iso('2025-10-20T14:00:00Z'),
        notes: 'Initial maintenance visit for HVAC systems.',
        created_at: iso('2025-10-05T09:00:00Z'),
      },
      {
        id: 'job-2',
        client_id: 'client-2',
        quotation_id: 'quotation-2',
        status: 'In Progress',
        assigned_technicians: ['Morgan Lee', 'Priya Singh'],
        scheduled_datetime: iso('2025-10-18T10:00:00Z'),
        notes: 'Electrical safety inspection for warehouse wing.',
        created_at: iso('2025-09-29T11:30:00Z'),
      },
      {
        id: 'job-3',
        client_id: 'client-3',
        quotation_id: null,
        status: 'Completed',
        assigned_technicians: ['Jordan Peters'],
        scheduled_datetime: iso('2025-09-15T08:00:00Z'),
        notes: 'Completed emergency call-out for HVAC failure.',
        completion_notes: 'System stabilised, recommend follow-up contract.',
        created_at: iso('2025-09-10T07:45:00Z'),
      },
    ],
    expenses: [
      {
        id: 'expense-1',
        type: 'general',
        job_id: null,
        amount: 1250,
        description: 'Office lease payment',
        date: '2025-09-01',
        created_at: iso('2025-09-01T08:00:00Z'),
      },
      {
        id: 'expense-2',
        type: 'job',
        job_id: 'job-2',
        amount: 480,
        description: 'Specialist testing equipment rental',
        date: '2025-09-22',
        created_at: iso('2025-09-22T12:25:00Z'),
      },
      {
        id: 'expense-3',
        type: 'general',
        job_id: null,
        amount: 320,
        description: 'Team training workshop',
        date: '2025-10-06',
        created_at: iso('2025-10-06T15:40:00Z'),
      },
    ],
    recurring_contracts: [
      {
        id: 'contract-1',
        client_id: 'client-2',
        description: 'Monthly facilities management retainer covering maintenance and inspections.',
        amount: 1800,
        frequency: 'monthly',
        start_date: '2025-06-01',
        next_billing_date: '2025-10-20',
        active: true,
        created_at: iso('2025-06-01T09:15:00Z'),
      },
      {
        id: 'contract-2',
        client_id: 'client-3',
        description: 'Quarterly safety compliance audit.',
        amount: 2200,
        frequency: 'quarterly',
        start_date: '2025-07-15',
        next_billing_date: '2025-12-15',
        active: true,
        created_at: iso('2025-07-15T10:20:00Z'),
      },
      {
        id: 'contract-3',
        client_id: 'client-1',
        description: 'Annual strategic facilities planning engagement.',
        amount: 9600,
        frequency: 'annually',
        start_date: '2025-02-01',
        next_billing_date: '2026-02-01',
        active: false,
        created_at: iso('2025-02-01T13:45:00Z'),
      },
    ],
    calendar_events: [
      {
        id: 'event-1',
        event_type: 'Job',
        title: 'HVAC Maintenance - Acme Facilities',
        datetime: iso('2025-10-20T14:00:00Z'),
        status: 'Scheduled',
        related_entity_type: 'job',
        related_entity_id: 'job-1',
      },
      {
        id: 'event-2',
        event_type: 'Invoice',
        title: 'Invoice Follow-up - Northwind Traders',
        datetime: iso('2025-10-08T09:00:00Z'),
        status: 'Overdue',
        related_entity_type: 'invoice',
        related_entity_id: 'invoice-2',
      },
      {
        id: 'event-3',
        event_type: 'Job',
        title: 'Emergency Response Review',
        datetime: iso('2025-10-12T11:30:00Z'),
        status: 'Completed',
        related_entity_type: 'job',
        related_entity_id: 'job-3',
      },
    ],
    activity_log: [
      {
        id: 'activity-1',
        type: 'Invoice Paid',
        description: 'Invoice invoice-1 marked as paid.',
        related_entity_type: 'invoice',
        related_entity_id: 'invoice-1',
        timestamp: iso('2025-10-10T09:00:00Z'),
      },
      {
        id: 'activity-2',
        type: 'Job Scheduled',
        description: 'New job scheduled for Northwind Traders.',
        related_entity_type: 'job',
        related_entity_id: 'job-2',
        timestamp: iso('2025-10-11T13:20:00Z'),
      },
      {
        id: 'activity-3',
        type: 'Contract Renewal',
        description: 'Recurring contract renewed for client Acme Facilities.',
        related_entity_type: 'contract',
        related_entity_id: 'contract-1',
        timestamp: iso('2025-10-13T08:45:00Z'),
      },
    ],
    users: [
      {
        id: 'user-1',
        email: 'admin@bizflow.com',
        role: 'admin',
        is_active: true,
        created_at: iso('2025-01-01T00:00:00Z'),
      },
      {
        id: 'user-2',
        email: 'tech@bizflow.com',
        role: 'technician',
        is_active: true,
        created_at: iso('2025-01-15T00:00:00Z'),
      }
    ],
    settings: [],
  };
}

function prepareRecordForInsert(table, row) {
  const record = {
    ...deepClone(row),
  };

  if (!record.id) {
    record.id = generateId(table);
  }

  if (!record.created_at && table !== 'activity_log' && table !== 'calendar_events') {
    record.created_at = new Date().toISOString();
  }

  if (table === 'activity_log' && !record.timestamp) {
    record.timestamp = new Date().toISOString();
  }

  return record;
}

function hydrateRow(table, row) {
  const base = deepClone(row);

  switch (table) {
    case 'quotations':
    case 'invoices':
    case 'jobs':
    case 'recurring_contracts':
      base.clients = getRecord('clients', base.client_id);
      break;
    default:
      break;
  }

  if (table === 'jobs' && base.quotation_id) {
    base.quotations = getRecord('quotations', base.quotation_id);
  }

  if (table === 'jobs' && typeof base.assigned_technicians === 'string') {
    base.assigned_technicians = base.assigned_technicians
      .split(',')
      .map((tech) => tech.trim())
      .filter(Boolean);
  }

  if (table === 'expenses' && base.job_id) {
    base.jobs = getRecord('jobs', base.job_id);
  }

  return base;
}

function getRecord(table, id) {
  if (!id) return null;
  const record = getCollection(table).find((item) => item.id === id);
  return record ? deepClone(record) : null;
}

function applyFilter(row, filter) {
  const target = row[filter.column];
  if (filter.operator === 'not') {
    return !matchesCondition(target, filter.compareOperator, filter.value);
  }

  return matchesCondition(target, filter.operator, filter.value);
}

function matchesCondition(target, operator, value) {
  switch (operator) {
    case 'eq':
      return normalise(target) === normalise(value);
    case 'gte':
      return compareValues(target, value) >= 0;
    case 'lte':
      return compareValues(target, value) <= 0;
    case 'is':
      if (value === null) {
        return target == null;
      }
      return normalise(target) === normalise(value);
    default:
      return true;
  }
}

function compareValues(a, b) {
  const left = coerceComparable(a);
  const right = coerceComparable(b);

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  const leftString = String(a ?? '');
  const rightString = String(b ?? '');
  return leftString.localeCompare(rightString);
}

function coerceComparable(value) {
  if (value == null) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) {
      return parsedDate;
    }

    const parsedNumber = Number(value);
    if (!Number.isNaN(parsedNumber)) {
      return parsedNumber;
    }
  }

  return value;
}

function normalise(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  return String(value);
}

function generateId(table) {
  const next = (idCounters[table] ?? 0) + 1;
  idCounters[table] = next;
  return `${table}-${next}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
