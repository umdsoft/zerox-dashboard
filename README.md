# ZeroX Admin Dashboard

This project is a Vue 3 + Vite + TailwindCSS admin dashboard skeleton featuring authentication scaffolding, protected routes, and reusable UI components ready to connect to your existing API.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   # update VITE_API_BASE with your API endpoint
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

The dashboard includes:

- Phone number + password authentication flow powered by Pinia and Axios.
- Global Axios interceptors that automatically append bearer tokens and handle 401 responses.
- Route guards that enforce admin-only access to protected views.
- Minimalist Tailwind-based layout with sidebar navigation and topbar actions.
- Reusable `AppButton`, `AppCard`, and `DataTable` components with built-in Excel export via SheetJS.
- Placeholder API integration with graceful fallbacks to sample data for rapid prototyping.
