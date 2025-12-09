# BizFlow Manager

A comprehensive Business Management System built with React, Vite, and Supabase (Mock).

## Features

### 🚀 Core
- **Dashboard**: Real-time KPIs, Revenue Charts, and Activity Feed.
- **Client Management**: CRM with search and details view.
- **Sales**: Quotes and Invoices with status tracking (Draft -> Sent -> Paid).
- **Jobs**: Recurring contracts and job scheduling.

### ✨ Advanced
- **PDF Generation**: Download professional Invoices and Quotes instantly.
- **Client Portal**: Dedicated portal for clients to view/approve quotes and pay invoices.
- **User Management**: Admin interface to manage team members and roles.
- **Authentication**: secure login with role-based access control.
- **PWA**: Installable on mobile and desktop (Progressive Web App).

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    # or
    npm i
    ```

### Development
Start the local development server:
```bash
npm run dev
```

### Production Build
Create an optimized production build:
```bash
npm run build
```
The output will be in the `dist/` folder.

### Preview Production
Test the production build locally:
```bash
npm run preview
```

## Deployment

### Vercel (Recommended)
This project includes a `vercel.json` configuration for easy deployment.
1.  Install Vercel CLI: `npm i -g vercel`
2.  Deploy: `vercel`

## Project Structure
- `src/pages`: Main application views.
- `src/components`: Reusable UI components.
- `src/context`: Global state (Auth).
- `src/lib`: Utilities (Supabase Mock, PDF Service).

## Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **Database**: Supabase (Mock Mode by default)
- **PDF**: jsPDF
- **Charts**: Recharts

## License
Private Property of BizFlow.
