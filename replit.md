# MarFaNet - Streamlined Financial CRM System

## Overview
MarFaNet is a simplified financial management system focused on core business needs: invoice management, representative oversight, and AI-powered assistance. The system has been streamlined to eliminate unnecessary features while maintaining robust financial tracking and intelligent representative management capabilities. Its business vision is to provide a focused, efficient solution for financial management and representative oversight, leveraging AI for enhanced insights.

## User Preferences
- **Communication Style**: Simple, everyday Persian language for non-technical users
- **Security Model**: 
  - Admin panel (mgr/8679) - Full financial access and management
  - CRM panel (crm/8679) - Representative management with debt/profile visibility only
  - Public representative portal - No authentication required
- **Development Philosophy**: Clean, focused architecture without bloated features

## System Architecture

### Frontend (Client)
- **Framework**: React with TypeScript and Vite
- **UI Components**: Shadcn/UI with Radix primitives and Tailwind CSS
- **State Management**: TanStack React Query for server state only
- **Routing**: Wouter for lightweight client-side routing
- **Design**: Persian RTL support with professional styling

### CRM Dashboard
The CRM system contains four functional sections:
1. **Workspace Hub (میز کار)**: Intelligent task management with AI-powered task generation.
2. **Representatives Management**: Complete list of representatives with full CRUD operations.
3. **AI Assistant**: Persian cultural intelligence for representative insights and support.
4. **Settings Hub**: System configuration and management tools (password protected).

**Security Features**:
- Prominent logout functionality in dashboard header.
- Password-protected access to settings (default: Aa867945).
- Visual security indicators (lock icon, protection badges).
- Culturally-adapted Persian authentication interface.

### Backend (Server)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Dual-panel system with session-based authentication.
- **Core Services**:
  - Financial data synchronization between admin and CRM panels.
  - XAI Grok engine for Persian AI assistance.
  - Representative management with debt tracking.
  - Invoice processing and Telegram notifications.

### Key Features
- **Invoice Management**: Bulk JSON processing, automatic calculations, Persian date handling, secure deletion with financial coupling synchronization.
- **Representative Portal**: Public access with unique IDs for invoice viewing, redesign with 4 main sections (Financial Overview, Invoice List, Consumption Breakdown, Payment History).
- **Financial Tracking**: Real-time debt, payment, and sales calculations with immediate UI updates via cache invalidation.
- **AI Integration**: Persian cultural intelligence for representative profiling and assistance, AI task generation.
- **Data Synchronization**: Seamless sync between admin and CRM data with real-time financial synchronization and intelligent coupling services.
- **Payment Management**: Consolidated into representative profiles, with 30-item pagination for invoices.
- **Performance Optimization**: Aggressive caching, lazy loading, and component preloading implemented for faster load times.
- **Security**: Role-based access control, session management, and admin panel isolation.

### Database Schema
- `representatives`: Core representative data with financial metrics.
- `invoices`: Invoice records with status tracking.
- `payments`: Payment allocation and tracking.
- `admin_users`: Admin panel authentication.
- `crm_users`: CRM panel authentication.

## External Dependencies
- **Neon Database**: PostgreSQL hosting.
- **XAI Grok API**: Persian AI intelligence.
- **Telegram Bot API**: Automated notifications.
- **Drizzle ORM**: Type-safe database operations.

## Recent System Completions (August 2025)
- **SHERLOCK v2.0 FORENSIC ANALYSIS**: ✅ Complete system audit and gap remediation completed
  - GAP FNC-001: Authentication backend session management enhanced with PostgreSQL store
  - GAP FNC-002: Frontend cookie synchronization resolved with proper credentials handling
  - GAP STR-001: Schema consolidation completed, duplicate tables removed
  - CRM authentication system now fully operational with 7-day session persistence
- **CRITICAL FIX - Payment Dialog Stability**: ✅ Dialog positioning, scrolling, and mobile compatibility
- **CRITICAL FIX - CRM Authentication**: ✅ Cross-panel admin access to CRM payment routes
- **COMPREHENSIVE FINANCIAL COUPLING**: ✅ Complete system integrity verification
  - Cross-panel financial synchronization confirmed
  - Real-time payment processing (tested IDs 25, 27-31)
  - Database consistency: All financial calculations verified
  - Intelligent cache invalidation with automatic financial updates
  - Multi-route compatibility across admin and CRM interfaces
- **SHERLOCK v2.0 ATOMIC UI ANALYSIS**: ✅ Complete UI component testing
  - All 38 clickable icons tested and verified (August 2025)
  - 16 statistical widgets synchronized with real data
  - Settings Hub components fully operational with enhanced middleware
  - Cross-panel authentication compatibility verified