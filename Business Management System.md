# Business Management System

A comprehensive business management application for managing clients, products, quotations, invoices, jobs, recurring contracts, and financial reporting. Built with React, Supabase, and modern web technologies.

## Features

### Core Modules

#### 📊 Dashboard
- Monthly revenue and profit KPIs
- New clients and overdue invoices tracking
- 6-month income vs expenses chart
- Recent activity feed

#### 👥 Clients (CRM)
- Client list with search functionality
- Add/edit client information
- Track client history and relationships
- Company and contact details management
- **Copy Portal Link** for secure client access

#### 📦 Products
- Product catalog management
- Pricing (retail and cost) tracking
- Profit margin calculations
- Category organization

#### 📝 Create Sale
- Toggle between quotation and invoice modes
- Interactive line item builder
- Real-time cost and profit estimates
- VAT/tax calculations
- Client and product selection

#### 💼 Sales Management
- Separate tabs for quotations and invoices
- Status workflow management
- Convert quotations to invoices
- Document tracking and filtering

#### 🔧 Jobs & Work Orders
- Create jobs from approved quotations
- Assign technician(s), schedule time, notes
- Status workflow: Pending → In Progress → Completed
- Job notes and completion tracking

#### 📜 Recurring Contracts
- Define and manage recurring service agreements
- Auto-generate invoices based on frequency (weekly, monthly, quarterly, annually)
- Track contract status (active/inactive) and next billing date
- Overview of active, due soon, and overdue contracts

#### 💰 Financials
- Job-level profitability breakdown
- Expense logging: job expenses + general overhead
- Monthly performance charts (revenue, profit, expenses)
- Expense breakdown (pie chart)
- Date range filtering

#### 📅 Calendar
- Auto-plot events from jobs, invoices (due dates), and custom events
- Unified timeline view of upcoming activities
- Summaries for upcoming events, scheduled jobs, and due invoices

#### ⚙️ Settings (Import/Export)
- **Import Clients**: Upload CSV to bulk add client data
- **Import Products**: Upload CSV to bulk add product data
- **Export Data**: Download client, product, invoice, and job data as CSV or JSON
- **Full Database Backup**: Export all core data tables as a single JSON file

### Client-Facing Portal

#### 🌐 Client Portal (`/portal` route)
- Secure, branded interface for clients
- View and download quotations and invoices
- Approve or decline quotations directly
- Upload proof of payment for invoices
- Track project status through a visual workflow (Quotation → Job → Invoice)
- View detailed job information and history

## Tech Stack

- **Frontend**: React 19 with Vite
- **UI Components**: shadcn/ui with Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router DOM
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (ready to implement)

## Database Schema

The application uses the following main tables:

- `clients` - Customer information
- `products` - Product/service catalog
- `quotations` - Sales quotations
- `quotation_lines` - Line items for quotations
- `invoices` - Invoices
- `invoice_lines` - Line items for invoices
- `jobs` - Work orders and job tracking
- `expenses` - Business expense tracking
- `activity_log` - Audit trail and activity feed
- `calendar_events` - Custom calendar events
- `templates` - Document templates
- `recurring_contracts` - Service agreements
- `users` - User management and roles

## Setup Instructions

### Prerequisites

- Node.js 22+ and pnpm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   cd business-management-app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `schema.sql` in the Supabase SQL Editor
   - Get your project URL and anon key from Project Settings → API

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server**
   ```bash
   pnpm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## Usage Guide

### Getting Started

1. **Add Clients**: Start by adding your clients in the Clients page
2. **Add Products**: Create your product/service catalog in the Products page
3. **Create Quotations**: Use the Create Sale page to generate quotations for clients
4. **Convert to Jobs**: Once approved, quotations can be converted to jobs
5. **Generate Invoices**: Create invoices from quotations or directly
6. **Track Expenses**: Log expenses in the Financials page
7. **Manage Contracts**: Set up recurring contracts in the Contracts page
8. **Monitor Performance**: View KPIs and reports in the Dashboard and Financials
9. **Client Portal**: Share secure links with clients to view their documents and track progress.

### Workflow

```
Client → Quotation → Approval → Job → Completion → Invoice → Payment → Reporting
```

## Project Structure

```
business-management-app/
├── public/              # Static assets
├── src/
│   ├── assets/         # Images and media
│   ├── components/     # Reusable components
│   │   ├── ui/        # shadcn/ui components
│   │   └── Layout.jsx # Main layout with navigation
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and configurations
│   │   └── supabase.js # Supabase client
│   ├── pages/         # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Clients.jsx
│   │   ├── Products.jsx
│   │   ├── CreateSale.jsx
│   │   ├── Sales.jsx
│   │   ├── Jobs.jsx
│   │   ├── Contracts.jsx
│   │   ├── Financials.jsx
│   │   ├── Calendar.jsx
│   │   ├── Settings.jsx
│   │   └── ClientPortal.jsx
│   ├── App.css        # Global styles
│   ├── App.jsx        # Main app component with routing
│   └── main.jsx       # Entry point
├── .env.example       # Environment variables template
├── schema.sql         # Database schema
└── package.json       # Dependencies and scripts
```

## Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

## Features Roadmap

### Implemented (Must Have & Should Have)
- ✅ Client management
- ✅ Product catalog
- ✅ Quotation creation
- ✅ Invoice creation
- ✅ Quotation to invoice conversion
- ✅ Job tracking
- ✅ Financial reporting
- ✅ Calendar view
- ✅ Activity logging
- ✅ Expense tracking
- ✅ **Client Portal**
- ✅ **Recurring Contracts & Service Agreements**
- ✅ **Data Import/Export (CSV, JSON)**

### Future Enhancements (Remaining Should Have & Nice to Have)
- 🔄 AI text extraction for client data
- 🔄 AI-generated product descriptions
- 🔄 PDF generation for quotations/invoices
- 🔄 Email notifications
- 🔄 Digital signatures
- 🔄 Payment gateway integration
- 🔄 Mobile / Field Technician App (Core features)
- 🔄 Role-Based Permissions & Audit Trails
- 🔄 AI financial forecasting
- 🔄 Geolocation and routing
- 🔄 Multi-factor authentication
- 🔄 Integration with accounting software

## Security Considerations

- Environment variables for sensitive data
- Supabase Row Level Security (RLS) policies should be configured
- User authentication and authorization (ready to implement)
- Input validation on all forms
- Secure API key management

## Contributing

This is a custom business management application. For feature requests or bug reports, please contact the development team.

## License

Proprietary - All rights reserved

## Support

For technical support or questions, please refer to the project documentation or contact the administrator.

---

**Built with ❤️ using React, Supabase, and modern web technologies**

