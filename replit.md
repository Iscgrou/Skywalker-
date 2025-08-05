# MarFaNet - Streamlined Financial CRM System

## Overview
MarFaNet is a simplified financial management system focused on core business needs: invoice management, representative oversight, and AI-powered assistance. The system has been streamlined to eliminate unnecessary features while maintaining robust financial tracking and intelligent representative management capabilities. Its business vision is to provide a focused, reliable tool for financial management and intelligent representative oversight in the Persian market, leveraging AI for cultural insights and efficient operations.

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
- **UI Components**: Shadcn/UI with Radix primitives and Tailwind CSS, supporting Persian RTL with professional styling.
- **State Management**: TanStack React Query for server state.
- **Routing**: Wouter for lightweight client-side routing.

### CRM Dashboard
- **Sections**: Workspace Hub (AI-powered task management), Representatives Management (CRUD operations for 237 representatives), AI Assistant (Persian cultural intelligence), Settings Hub (password-protected configuration).
- **Security Features**: Prominent logout, password-protected settings (default: Aa867945), visual security indicators, culturally-adapted authentication interface.
- **Performance Optimization**: Lazy loading for heavy components, aggressive caching (8-15 min), Suspense loading, disabled automatic refetching, component preloading.

### Backend (Server)
- **Framework**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Dual-panel system with session-based authentication.
- **Core Services**: Financial data synchronization, XAI Grok engine for Persian AI, representative management (including debt tracking), invoice processing with Telegram notifications.
- **Financial Synchronization**: Secure invoice deletion with complete financial coupling, real-time cache invalidation across CRM/Admin panels, automatic recalculation of representative financial data, and audit trail for financial operations.
- **Intelligent Coupling Service (SHERLOCK v4.0)**: Provides task-representative synchronization, financial-workflow synchronization, real-time financial synchronization, and AI learning cycles.

### Key Features
- **Invoice Management**: Bulk JSON processing, automatic calculations, Persian date handling.
- **Representative Portal**: Public access with unique IDs for invoice viewing, redesigned with comprehensive financial overview, invoice list, consumption breakdown, and payment history sections.
- **Financial Tracking**: Real-time debt, payment, and sales calculations.
- **AI Integration**: Persian cultural intelligence for representative profiling and assistance (DA VINCI v2.0+).
- **Data Synchronization**: Seamless sync between admin and CRM data.
- **Payment Management**: Consolidated into representative profiles, with 30-item pagination for invoices.

### Database Schema
- `representatives`: Core representative data with financial metrics.
- `invoices`: Invoice records with status tracking.
- `payments`: Payment allocation and tracking.
- `admin_users`: Admin panel authentication.
- `crm_users`: CRM panel authentication.

## External Dependencies
- **Neon Database**: PostgreSQL hosting.
- **XAI Grok API**: Persian AI intelligence (grok-beta model).
- **Telegram Bot API**: Automated notifications.
- **Drizzle ORM**: Type-safe database operations.