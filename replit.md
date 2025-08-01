# Financial Management System - MarFaNet

## Overview
MarFaNet is a comprehensive financial management system designed for managing invoices, payments, and sales representatives. It streamlines financial operations by providing detailed tracking of debts, payments, and commissions, with features like efficient invoice generation, representative financial oversight, and automated reporting. The system supports both administrative and public-facing portals and includes advanced capabilities such as AI analysis, Telegram integration for notifications, and bulk invoice processing. Its ambition is to be a production-ready system for financial management with integrated intelligent reporting, analytics, and gamification, optimized for performance and security.

## Recent Changes (2025-08-01)
**✅ DA VINCI v9.0 IMPLEMENTATION - COMPREHENSIVE SYSTEM ENHANCEMENT:**
- **Performance Analytics Module**: Created dedicated performance analytics page with representative selection capability and comprehensive metrics
- **Enhanced CRM Task Management**: Implemented realistic statistics with dynamic data, Persian Cultural AI integration, and animated UI components
- **Representative Profile Enhancement**: Added biography section with voice recording capability and Persian Cultural AI recommendations
- **Voice Processing Integration**: Enhanced Groq + xAI integration with Persian sentiment analysis and cultural context understanding
- **Currency Standardization**: Completed Rial → Toman conversion across all CRM modules using CurrencyFormatter.formatForCRM
- **UI Polish & Animations**: Added smooth transitions, hover effects, and animated loading states across all CRM components
- **Navigation Enhancement**: Integrated Performance Analytics into CRM Dashboard with optimized layout
- **Real-time Data Processing**: Implemented dynamic task statistics with live filtering and representative-specific analytics

**🔧 Technical Architecture Improvements:**
- Resolved all LSP diagnostics errors in crm-tasks.tsx and crm-routes.ts
- Fixed JSX fragment issues in CRM Dashboard with proper component structure
- Enhanced voice processing service with Persian Cultural Intelligence for task reporting
- Standardized Persian RTL support with consistent Toman currency formatting

## User Preferences
Preferred communication style: Simple, everyday language.
- **Security Requirements**: 
  - Admin panel (mgr/8679) for financial management with full access
  - CRM panel (crm/8679) for customer relationship management with restricted access (debt amounts and profiles only)
  - Public representative portal remains accessible without login
- **Authentication**: Dual-panel username and password system with role-based access control
- **CRM Integration**: Intelligent Persian Cultural AI system for representative management
- **Development Approach**: DA VINCI v6.0 Adaptive Systems Architecture with Tier-based development

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
- **Core Features**:
    - **Invoice Management**: Bulk JSON upload processing, automatic calculation, Persian date handling, and Telegram notifications.
    - **Representative Portal**: Public access via unique public IDs, displaying invoices and usage data.
    - **Financial Tracking**: Comprehensive debt, payment, and commission tracking.
    - **CRM Intelligence System**: Persian Cultural AI for representative psychological profiling, intelligent task generation, representative level classification, performance analytics, and an AI Knowledge Base with learning capabilities.
    - **Dual Authentication System**: Admin panel with full financial access and CRM panel with restricted access, featuring role-based access control and data segmentation.
    - **Clock Mechanism Architecture**: A synchronized system with "Hour Hand" (Financial Management), "Minute Hand" (Representative Management + CRM), and "Second Hand" (Automation & Monitoring + AI Decision Logging).
    - **Data Reset System**: Selective data deletion with referential integrity preservation and activity logging.
    - **JSON Processing**: Support for various PHPMyAdmin export formats with intelligent detection and dynamic data extraction.
    - **Reporting & Analytics**: Intelligent reporting service for executive reports, ROI analysis, forecasting, and multi-format export (PDF, Excel, CSV, PowerPoint, JSON). Includes scheduled reports system for automated delivery.
    - **Gamification Engine**: XP system, achievements, leaderboards, and daily challenges.

### System Design Choices
- **Data Flow**: Defined flows for invoice processing, payment allocation, and AI analysis.
- **Security**: Conditional security headers, session middleware optimization, and robust authentication.
- **Error Handling & Stability**: Enhanced database connection pooling, retry logic, graceful error recovery, process monitoring, and graceful shutdown.
- **Performance**: Optimized for large file processing with extended timeouts, memory optimization, and batch processing.
- **Multi-Format JSON Architecture**: Adaptive processing for various JSON formats.

## External Dependencies
- **Neon Database**: PostgreSQL hosting with serverless architecture.
- **xAI Grok API**: For AI analysis and financial insights.
- **Telegram Bot API**: For automated notifications and messaging.
- **Drizzle ORM**: Type-safe database operations with PostgreSQL.
- **TanStack Query**: For server state management and caching.
- **Zod**: For runtime type validation and schema definition.
- **React Hook Form**: For form state management with validation.
- **date-fns**: For date manipulation and formatting.
- **Multer**: For file upload handling (JSON processing).
- **Express-session with connect-pg-simple**: For PostgreSQL-backed session management.