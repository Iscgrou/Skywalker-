# Financial Management System - MarFaNet

## Overview

This is a comprehensive financial management system for MarFaNet, designed to manage invoices, payments, representatives (sales partners), and financial operations with advanced features like AI analysis, Telegram integration, and bulk invoice processing. The application is built as a full-stack system with a React frontend and Express.js backend, using PostgreSQL with Drizzle ORM for data management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server components:

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for build tooling
- **UI Library**: Shadcn/UI components with Radix UI primitives
- **Styling**: Tailwind CSS with custom MarFaNet branding
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **File Processing**: Multer for handling JSON file uploads
- **External Integrations**: Google Gemini AI and Telegram Bot API

## Key Components

### Database Schema
The system manages four primary entities:
- **Representatives**: Sales representatives with unique codes, panel usernames, and financial tracking
- **Sales Partners**: Commission-based partners who refer representatives
- **Invoices**: Billing documents with usage data, Persian date support, and Telegram integration
- **Payments**: Payment tracking with allocation to specific invoices
- **Activity Logs**: System activity tracking
- **Settings**: Configurable system parameters

### Core Features
1. **Invoice Management**: Bulk JSON upload processing, automatic calculation, and Persian date handling
2. **Representative Portal**: Public portal access using unique public IDs
3. **Telegram Integration**: Automated invoice notifications with customizable templates
4. **AI Assistant**: Google Gemini integration for financial analysis and insights
5. **Financial Tracking**: Comprehensive debt, payment, and commission tracking
6. **Multi-language Support**: Persian (Farsi) UI with RTL support

## Data Flow

### Invoice Processing Flow
1. JSON files uploaded via drag-and-drop interface
2. Server validates and processes usage data
3. Invoices created with calculated amounts and Persian dates
4. Bulk operations for Telegram notifications
5. Representative portal updates reflect new invoices

### Payment Allocation Flow
1. Payments recorded with representative association
2. Manual or automatic allocation to specific invoices
3. Real-time debt calculation and representative balance updates
4. Activity logging for audit trail

### AI Analysis Flow
1. Financial data aggregated from database
2. Gemini API processes data for insights and recommendations
3. Results displayed in AI assistant interface with Persian language support

## External Dependencies

### Required Services
- **Neon Database**: PostgreSQL hosting with serverless architecture
- **Google Gemini API**: AI analysis and financial insights
- **Telegram Bot API**: Automated notifications and messaging

### Key Libraries
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **TanStack Query**: Server state management and caching
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Form state management with validation
- **date-fns**: Date manipulation and formatting
- **Multer**: File upload handling for JSON processing

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR
- Express server with TypeScript compilation
- Database migrations using Drizzle Kit
- Environment variables for API keys and database URLs

### Production Build
- Vite builds optimized frontend bundle
- esbuild compiles server code to single bundle
- Static assets served by Express
- Database schema pushed using Drizzle migrations

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `GEMINI_API_KEY`: Google AI API authentication
- Telegram bot token and chat ID stored in settings table
- Configurable invoice calculation rates and templates

The system is designed to be self-contained with minimal external dependencies while providing comprehensive financial management capabilities with modern web technologies and AI-enhanced insights.

## Recent Testing Results (July 21, 2025)

### JSON Processing Success ✅
- Successfully processed 3,527 real data records from MarFaNet JSON export
- Created 198 invoices with automatic representative profile generation  
- Only 3 invalid records (zero amounts) filtered out correctly
- Total debt calculated: 119,695,100 تومان

### System Components Verified ✅
- **Database Integration**: PostgreSQL with Drizzle ORM working perfectly
- **Invoice Generation**: Bulk processing from PHPMyAdmin JSON exports
- **Representative Management**: Auto-creation from admin_username fields
- **Public Portal Access**: Secure portal links with publicId system
- **AI Financial Analysis**: Gemini API integration providing insights
- **Dashboard Analytics**: Real-time financial overview and activity logs
- **Telegram Integration**: API endpoints ready, bot tested and working
- **Portal URL Structure**: Fixed to use standard deployed URL (https://agent-portal-shield-info9071.replit.app)
- **GCE Authentication Fix**: Added trust proxy configuration for Replit deployment

## System Stability Improvements (July 21, 2025)

### Database Connection Resilience ✅
- **Enhanced Connection Pooling**: Implemented optimized PostgreSQL connection pool with proper limits (max: 5 connections)
- **Retry Logic**: Added exponential backoff retry mechanism for all critical database operations
- **Health Monitoring**: Integrated startup database health checks and connection validation
- **WebSocket Configuration**: Optimized Neon serverless configuration for stability

### Production-Grade Error Handling ✅
- **Graceful Error Recovery**: Replaced crash-on-error with comprehensive error logging and graceful degradation
- **Process Monitoring**: Added uncaught exception and unhandled rejection handlers
- **Graceful Shutdown**: Implemented clean shutdown procedures for database connections and HTTP server
- **Enhanced Logging**: Added structured logging with operation tracing and error categorization

### Critical Bug Fixes ✅
- **Storage Interface**: Added missing `getRepresentative(id)` method to prevent undefined method errors
- **Connection Stability**: Resolved WebSocket connection issues causing server crashes
- **Error Propagation**: Fixed error handling middleware to prevent server termination on API errors

## Enhanced Features Implementation (July 21, 2025)

### Invoice Management Enhancements ✅
- **Advanced Telegram Integration**: Implemented comprehensive Telegram sending with single/multiple/all invoice options
- **Structured Usage Data Display**: Created professional table-based display for invoice usage details in public portal
- **Dynamic Invoice Details**: Added expandable invoice rows with detailed usage information and summary statistics
- **Template Customization System**: Integrated settings panel for customizing invoice template and usage details display

### UI/UX Improvements ✅
- **SelectItem Component Fixes**: Resolved empty value issues across all forms and dropdown components
- **Enhanced Public Portal**: Added professional usage details table with color-coded event types and structured data presentation
- **Settings Panel Integration**: Created comprehensive invoice template configuration tab with real-time preview
- **Persian RTL Support**: Maintained proper right-to-left text flow and Persian number formatting throughout enhancements

### System Integration ✅
- **Backend API Enhancement**: Extended portal API to include complete usage data for detailed viewing
- **Template Configuration**: Added database settings for controlling usage details display columns and formatting
- **Component Synchronization**: Ensured seamless integration between settings panel and public portal display rendering