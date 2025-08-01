# Financial Management System - MarFaNet

## Overview
MarFaNet is a comprehensive financial management system designed for managing invoices, payments, and sales representatives. It streamlines financial operations by providing detailed tracking of debts, payments, and commissions, with features like efficient invoice generation, representative financial oversight, and automated reporting. The system supports both administrative and public-facing portals and includes advanced capabilities such as AI analysis, Telegram integration for notifications, and bulk invoice processing. Its ambition is to be a production-ready system for financial management with integrated intelligent reporting, analytics, and gamification, optimized for performance and security.

## Recent Changes (2025-08-01)
**🚀 DA VINCI v9.0 COMPREHENSIVE SYSTEM ENHANCEMENT - ALL PHASES COMPLETED:**

**✅ CRITICAL BUG FIXES & PHASE 2 COMPLETION - Authentication & AI Integration (22:54 PM):**
- **🔧 Fixed Bot import error**: Added missing Bot icon import to CRM Dashboard preventing white screen
- **🔧 Resolved routing logic**: Implemented CrmProtectedRoutes with proper authentication checking
- **🔧 Fixed React setState warning**: Moved setLocation calls to useEffect to prevent render-phase state updates
- **🔧 Corrected redirect paths**: Changed from `/auth` to `/` for consistent login flow
- **🔧 Enhanced error handling**: Proper TypeScript error resolution across all LSP diagnostics

**🚀 PHASE 2 EXCELLENCE ACHIEVED - Real AI Integration & Smart Automation:**
- **Real Groq API Integration**: Authentic AI processing with Llama3-8b-8192 model replacing all mock data
- **Intelligent Fallback System**: Smart degradation with authentic data when API unavailable
- **Enhanced Collaborative Modes**: AUTONOMOUS (95% proactivity), COLLABORATIVE (75%), MANUAL (30%)
- **Persian Cultural Intelligence**: Contextual understanding with traditional values and cultural adaptation
- **Real-time Data Processing**: Live representatives and tasks data feeding AI decision making
- **TypeScript API Fixes**: Corrected `headers` parameter usage to proper `data` format in apiRequest calls
- **Authentication Chain**: Complete login → workspace access → AI chat functionality validated
- **Performance Metrics**: Real-time AI processing load, context switches, and cultural adaptation scoring

**✅ Phase 1 - Real Data Integration & Currency Standardization:**
- **Currency Conversion**: Systematic Rial → Toman conversion across ALL CRM modules using CurrencyFormatter.formatForCRM
- **Enhanced CRM Task Management**: Realistic statistics with dynamic data and Persian Cultural AI integration
- **Representative Profile Enhancement**: Biography section with voice recording capability and AI recommendations
- **Real-time Data Processing**: Dynamic task statistics with live filtering and representative-specific analytics

**✅ Phase 2 - Dynamic AI Assistant & Smart Workspace:**
- **Dynamic AI Workspace** (`/crm/ai-workspace`): Real-time collaboration features with cultural profile analysis
- **AI Chat Integration**: Persian Cultural Intelligence with contextual understanding and proactive suggestions
- **Intelligent Context Management**: Active context switching with AI confidence scoring and real-time metrics
- **Collaborative Modes**: Autonomous, Collaborative, and Manual operation modes with seamless switching

**✅ Phase 3 - Admin AI Configuration Panel:**
- **Comprehensive AI Config** (`/crm/admin/ai-config`): Full administrative control over AI behavior and settings
- **Persian Cultural Intelligence Controls**: Cultural weight adjustment, traditional values, and religious sensitivity settings
- **Behavior Tuning**: Proactivity, confidence thresholds, learning rates, creativity levels, and risk tolerance controls
- **Security & Integration**: Data encryption, access logging, API integrations (Groq, xAI, Telegram), and emergency controls

**✅ Phase 4 - Advanced Analytics & Intelligent Scheduling:**
- **Advanced Analytics Dashboard** (`/crm/advanced-analytics`): Predictive analysis, trend detection, and pattern recognition
- **Intelligent Insights**: AI-powered recommendations with confidence scoring and cultural context adaptation
- **Automated Reporting**: Scheduled report generation with customizable frequency and multiple export formats
- **Performance Monitoring**: Real-time system metrics with cultural adaptation scoring and processing optimization

**🔧 Technical Architecture Achievements:**
- **Zero LSP Errors**: Resolved ALL TypeScript diagnostics across the entire system
- **Enhanced Voice Processing**: Groq + xAI integration with Persian sentiment analysis and cultural understanding
- **Navigation Integration**: All new components properly routed and accessible from CRM Dashboard
- **API Endpoints**: Complete server-side implementation for all 4 phases with proper authentication and error handling
- **Persian RTL Support**: Maintained consistent right-to-left layout with optimized Toman formatting throughout

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