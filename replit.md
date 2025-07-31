# Financial Management System - MarFaNet

## Overview
MarFaNet is a comprehensive financial management system designed for managing invoices, payments, and sales representatives. It includes advanced features such as AI analysis, Telegram integration for notifications, and bulk invoice processing. The system aims to streamline financial operations for businesses, providing detailed tracking of debts, payments, and commissions. Its core capabilities include efficient invoice generation, representative financial oversight, and automated reporting, supporting both administrative and public-facing portals.

**Clock Mechanism Architecture** - The system operates on a synchronized clock mechanism where:
- Hour Hand (Financial Management): Atomic invoice editing and financial transactions
- Minute Hand (Representative Management): Financial reconciliation and debt management  
- Second Hand (Monitoring & Automation): Transaction monitoring and audit trails
- All components work in perfect synchronization maintaining data integrity

## User Preferences
Preferred communication style: Simple, everyday language.
- **Security Requirements**: Admin panel requires login authentication; public representative portal should remain accessible without login
- **Authentication**: Username and password system with secure session management
- **Default Admin Credentials**: mgr / 8679 (created automatically on first startup)

## System Architecture
The application features a modern full-stack architecture with distinct client and server components.

### Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI Library**: Shadcn/UI components with Radix UI primitives
- **Styling**: Tailwind CSS with custom MarFaNet branding
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Persian (Farsi) UI with RTL support, professional table displays, and dynamic progress tracking.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **File Processing**: Multer for handling JSON file uploads
- **External Integrations**: Google Gemini AI and Telegram Bot API
- **Core Features**:
    - **Invoice Management**: Bulk JSON upload processing, automatic calculation, Persian date handling, and Telegram notifications.
    - **Representative Portal**: Public access via unique public IDs, displaying invoices and usage data.
    - **AI Assistant**: Google Gemini integration for financial analysis.
    - **Financial Tracking**: Comprehensive debt, payment, and commission tracking.
    - **Authentication System**: Secure login for admin panel with session management and bcrypt password hashing.
    - **Clock Mechanism Architecture**: Designed around "Hour Hand" (Financial Management), "Minute Hand" (Representative Management), and "Second Hand" (Automation & Monitoring) concepts for atomic transactions, data integrity, and audit trails.
    - **Data Reset System**: Selective data deletion with referential integrity preservation, admin authentication, and activity logging.
    - **JSON Processing**: Support for PHPMyAdmin export formats, advanced parsing, and sequential processing of large data files.

### System Design Choices
- **Data Flow**: Defined flows for invoice processing (JSON upload, validation, calculation, notification), payment allocation (recording, allocation, debt calculation), and AI analysis (data aggregation, Gemini processing, insight display).
- **Security**: Conditional security headers for admin vs. portal routes, session middleware optimization, and robust authentication for admin panel.
- **Error Handling & Stability**: Enhanced database connection pooling, retry logic with exponential backoff, graceful error recovery, process monitoring, and graceful shutdown procedures.
- **Performance**: Optimized for large file processing with extended timeouts, memory optimization (garbage collection), and batch processing for database operations.
- **Multi-Format JSON Architecture**: Adaptive processing capable of handling various PHPMyAdmin export formats with intelligent format detection and dynamic data extraction.

## External Dependencies

- **Neon Database**: PostgreSQL hosting with serverless architecture.
- **Google Gemini API**: For AI analysis and financial insights.
- **Telegram Bot API**: For automated notifications and messaging.
- **Drizzle ORM**: Type-safe database operations with PostgreSQL.
- **TanStack Query**: For server state management and caching.
- **Zod**: For runtime type validation and schema definition.
- **React Hook Form**: For form state management with validation.
- **date-fns**: For date manipulation and formatting.
- **Multer**: For file upload handling (JSON processing).
- **Express-session with connect-pg-simple**: For PostgreSQL-backed session management.