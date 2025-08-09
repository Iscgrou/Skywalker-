# MarFaNet - Streamlined Financial CRM System

## Overview
MarFaNet is a simplified financial management system focused on core business needs: invoice management, representative oversight, and AI-powered assistance. Its business vision is to provide a focused, efficient solution for financial management and representative oversight, leveraging AI for enhanced insights. The system aims to be a streamlined, robust financial tracking and intelligent representative management solution.

## User Preferences
- **Communication Style**: Simple, everyday Persian language for non-technical users
- **Security Model**: 
  - Admin panel (mgr/8679) - Full financial access and management
  - CRM panel (crm/8679) - Representative management with debt/profile visibility only
  - Public representative portal - No authentication required
- **Development Philosophy**: Clean, focused architecture without bloated features

## Recent Changes (August 9, 2025)
- **SHERLOCK v17.5 Deployment Success**: Resolved database endpoint failure with dual-driver approach
- **Frontend Access Fix**: Implemented maintenance mode bypass for complete UI accessibility
- **Authentication Fallback**: Enhanced fallback system ensures login functionality during database outages
- **User Confirmed Resolution**: Dev link access restored and functional

## System Architecture

### Frontend (Client)
- **Framework**: React with TypeScript and Vite
- **UI Components**: Shadcn/UI with Radix primitives and Tailwind CSS
- **State Management**: TanStack React Query for server state only
- **Routing**: Wouter for lightweight client-side routing
- **Design**: Persian RTL support with professional styling

### CRM Dashboard
- **Sections**: Workspace Hub (AI-powered task generation), Representatives Management (CRUD), AI Assistant (Persian cultural intelligence), Settings Hub (password protected system configuration).
- **Security**: Prominent logout, password-protected settings (default: Aa867945), visual security indicators, culturally-adapted Persian authentication.

### Backend (Server)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Dual-panel session-based authentication.
- **Core Services**: Financial data synchronization, XAI Grok engine for Persian AI, representative management with debt tracking, invoice processing, Telegram notifications.

### Key Features
- **Invoice Management**: Bulk JSON processing, automatic calculations, Persian date handling, secure deletion with financial coupling synchronization.
- **Representative Portal**: Public access via unique IDs for invoice viewing, redesigned with sections for Financial Overview, Invoice List, Consumption Breakdown, and Payment History.
- **Financial Tracking**: Real-time debt, payment, and sales calculations with immediate UI updates via cache invalidation.
- **AI Integration**: Persian cultural intelligence for representative profiling and assistance, AI task generation.
- **Data Synchronization**: Seamless admin/CRM data sync with real-time financial synchronization and intelligent coupling services.
- **Payment Management**: Consolidated into representative profiles, with 30-item pagination for invoices and FIFO (First-In, First-Out) allocation.
- **Performance Optimization**: Aggressive caching, lazy loading, and component preloading.
- **Security**: Role-based access control, session management, admin panel isolation.
- **Database Schema**: `representatives`, `invoices`, `payments`, `admin_users`, `crm_users`.

## External Dependencies
- **Neon Database**: PostgreSQL hosting.
- **XAI Grok API**: Persian AI intelligence.
- **Telegram Bot API**: Automated notifications.
- **Drizzle ORM**: Type-safe database operations.