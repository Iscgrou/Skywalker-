# Financial Management System - MarFaNet

## Overview
MarFaNet is a comprehensive financial management system for managing invoices, payments, and sales representatives. It streamlines financial operations through detailed tracking of debts, payments, and commissions, offering efficient invoice generation, representative financial oversight, and automated reporting. The system supports both administrative and public-facing portals, incorporating AI analysis, Telegram integration for notifications, and bulk invoice processing. Its vision is to become a production-ready financial management system with integrated intelligent reporting, analytics, and gamification, optimized for performance and security.

## User Preferences
Preferred communication style: Simple, everyday language.
- **Security Requirements**: 
  - Admin panel (mgr/8679) for financial management with full access
  - CRM panel (crm/8679) for customer relationship management with restricted access (debt amounts and profiles only)
  - Public representative portal remains accessible without login
- **Authentication**: Dual-panel username and password system with role-based access control
- **CRM Integration**: Intelligent Persian Cultural AI system for representative management
- **Development Approach**: DA VINCI v6.0 Adaptive Systems Architecture with Tier-based development
- **Recent Achievement**: Complete SHERLOCK v3.0 CRM dashboard restoration (Aug 2025) - Full 5-tab dashboard with working API integration, data synchronization, modal components, and fully functional representatives list displaying all 237 representatives with stable data loading

## System Architecture
The application features a modern full-stack architecture with distinct client and server components.

### Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI Library**: Shadcn/UI components with Radix UI primitives
- **Styling**: Tailwind CSS with custom MarFaNet branding
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Persian (Farsi) UI with RTL support, professional table displays, and Claymorphism design.
- **CRM Dashboard**: Complete SHERLOCK v3.0 dashboard with 5 integrated tabs (Representatives, Performance Analytics, Task Management, AI Helper, Overview).

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Core Features**:
    - **Invoice Management**: Bulk JSON upload processing, automatic calculation, Persian date handling, and Telegram notifications.
    - **Representative Portal**: Public access via unique public IDs, displaying invoices and usage data.
    - **Financial Tracking**: Comprehensive debt, payment, and commission tracking.
    - **CRM Intelligence System**: Persian Cultural AI for psychological profiling, intelligent task generation, representative classification, performance analytics, and an AI Knowledge Base.
    - **Unified CRM Dashboard**: Complete SHERLOCK v3.0 dashboard with integrated tabs: Representatives Management (237 active reps with full list functionality), Performance Analytics, Task Management, AI Helper, and System Overview. All data loading issues resolved and system stability achieved.
    - **Dual Authentication System**: Admin panel with full financial access and CRM panel with restricted access, featuring role-based access control and data segmentation.
    - **Clock Mechanism Architecture**: Synchronized system with "Hour Hand" (Financial Management), "Minute Hand" (Representative Management + CRM), and "Second Hand" (Automation & Monitoring + AI Decision Logging).
    - **Data Reset System**: Selective data deletion with referential integrity preservation and activity logging.
    - **JSON Processing**: Support for various PHPMyAdmin export formats with intelligent detection and dynamic data extraction.
    - **Reporting & Analytics**: Intelligent reporting service for executive reports, ROI analysis, forecasting, and multi-format export (PDF, Excel, CSV, PowerPoint, JSON). Includes scheduled reports system.
    - **Gamification Engine**: XP system, achievements, leaderboards, and daily challenges.

### System Design Choices
- **Data Flow**: Defined flows for invoice processing, payment allocation, and AI analysis.
- **Security**: Conditional security headers, session middleware optimization, and robust authentication.
- **Error Handling & Stability**: Enhanced database connection pooling, retry logic, graceful error recovery, process monitoring, and graceful shutdown.
- **Performance**: Optimized for large file processing with extended timeouts, memory optimization, and batch processing.
- **Multi-Format JSON Architecture**: Adaptive processing for various JSON formats.

## External Dependencies
- **Neon Database**: PostgreSQL hosting.
- **XAI Grok API**: Primary AI engine for Persian cultural intelligence, task generation, and financial analysis.
- **Groq API**: Speech-to-text conversion and audio transcription.
- **Telegram Bot API**: For automated notifications and messaging.
- **Drizzle ORM**: Type-safe database operations with PostgreSQL.
- **TanStack Query**: For server state management and caching.
- **Zod**: For runtime type validation and schema definition.
- **React Hook Form**: For form state management with validation.
- **date-fns**: For date manipulation and formatting.
- **Multer**: For file upload handling (JSON processing).
- **Express-session with connect-pg-simple**: For PostgreSQL-backed session management.