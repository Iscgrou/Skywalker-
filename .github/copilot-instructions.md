# Copilot Instructions for MarFaNet Financial Management System

## Overview
MarFaNet is a full-stack financial management system designed for enterprise-level operations. It features AI-powered financial analysis, Telegram integration, and robust JSON processing capabilities. The architecture is built with modern technologies, ensuring scalability and maintainability.

## Key Architectural Details

### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **Styling**: Tailwind CSS with RTL support for Persian
- **State Management**: TanStack React Query v5
- **Routing**: Wouter
- **Form Validation**: React Hook Form with Zod

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: PostgreSQL-backed sessions using `connect-pg-simple`
- **Authentication**: bcrypt with session-based authentication
- **File Handling**: Multer for JSON uploads

### External Integrations
- **AI**: Google Gemini API for financial insights
- **Messaging**: Telegram Bot API for notifications
- **Database Hosting**: Neon serverless PostgreSQL

## Developer Workflows

### Setup
1. Clone the repository and install dependencies:
   ```bash
   git clone <repository-url>
   cd marfanet-financial-system
   npm install
   ```
2. Configure environment variables in `.env`:
   ```env
   DATABASE_URL="postgresql://user:pass@host/db"
   GEMINI_API_KEY="your-gemini-api-key"
   SESSION_SECRET="your-session-secret"
   ```
3. Push database schema:
   ```bash
   npm run db:push
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Testing
- Use `npm run dev` to run both frontend and backend in development mode.
- Database operations:
  - `npm run db:push`: Push schema changes
  - `npm run db:studio`: Open Drizzle Studio
- Type checking:
  ```bash
  npm run type-check
  ```

### Production
1. Build the application:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## Project-Specific Conventions

### File Structure
- **Frontend**: Located in `client/`
  - `pages/`: Application pages
  - `components/`: Reusable UI components
  - `lib/`: Utility functions
  - `contexts/`: React contexts
- **Backend**: Located in `server/`
  - `index.ts`: Server entry point
  - `routes.ts`: API routes
  - `storage.ts`: Database operations
  - `db.ts`: Database connection
  - `services/`: Business logic
- **Shared**: Shared TypeScript schemas in `shared/`

### API Routes
- **Admin Panel (Protected)**:
  ```
  GET    /api/dashboard          # Financial overview
  GET    /api/representatives    # Representative management
  GET    /api/invoices           # Invoice operations
  POST   /api/invoices/generate  # Bulk JSON processing
  GET    /api/payments           # Payment tracking
  GET    /api/settings/*         # System configuration
  ```
- **Public Portal (Unprotected)**:
  ```
  GET    /api/portal/:publicId   # Representative portal access
  GET    /portal/:publicId       # Public portal interface
  ```

### Security Practices
- **Session Management**: PostgreSQL-backed sessions with 24-hour expiration.
- **Authentication**: bcrypt for password hashing.
- **Headers**: Conditional security headers for admin vs portal routes.
- **CORS**: Configured for cross-origin resource sharing.

## Examples
- **Database Schema**:
  ```sql
  representatives: Sales representatives with financial tracking
  invoices: Billing documents with usage data and Persian dates
  payments: Payment tracking with invoice allocation
  sales_partners: Commission-based referral partners
  activity_logs: Comprehensive system activity tracking
  settings: Configurable system parameters
  admin_users: Administrative user management
  ```
- **Environment Variables**:
  ```env
  DATABASE_URL="postgresql://user:pass@host/db"
  GEMINI_API_KEY="your-gemini-api-key"
  SESSION_SECRET="your-session-secret"
  TELEGRAM_BOT_TOKEN="your-bot-token"
  TELEGRAM_CHAT_ID="your-chat-id"
  ```

## Notes
- Ensure all environment variables are correctly configured before running the application.
- Follow the file structure and naming conventions for consistency.
- Use Drizzle ORM for all database operations to maintain schema integrity.
