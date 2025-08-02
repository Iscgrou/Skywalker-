# MarFaNet - Streamlined Financial CRM System

## Overview
MarFaNet is a simplified financial management system focused on core business needs: invoice management, representative oversight, and AI-powered assistance. The system has been streamlined to eliminate unnecessary features while maintaining robust financial tracking and intelligent representative management capabilities.

## User Preferences
- **Communication Style**: Simple, everyday Persian language for non-technical users
- **Security Model**: 
  - Admin panel (mgr/8679) - Full financial access and management
  - CRM panel (crm/8679) - Representative management with debt/profile visibility only
  - Public representative portal - No authentication required
- **Development Philosophy**: Clean, focused architecture without bloated features
- **Recent Cleanup**: Complete removal of performance analytics, task management, and overview dashboard sections (August 2025)

## Current System Architecture

### Frontend (Client)
- **Framework**: React with TypeScript and Vite
- **UI Components**: Shadcn/UI with Radix primitives and Tailwind CSS
- **State Management**: TanStack React Query for server state only
- **Routing**: Wouter for lightweight client-side routing
- **Design**: Persian RTL support with professional styling

### CRM Dashboard (Simplified)
The CRM system now contains only two functional sections:
1. **Representatives Management**: Complete list of 237 representatives with full CRUD operations
2. **AI Assistant**: Persian cultural intelligence for representative insights and support

**Removed Components**: Performance Analytics, Task Management, Overview Dashboard, and all related UI components have been completely eliminated.

### Backend (Server)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Dual-panel system with session-based auth
- **Core Services**:
  - Financial data synchronization between admin and CRM panels
  - XAI Grok engine for Persian AI assistance
  - Representative management with debt tracking
  - Invoice processing and Telegram notifications

### Key Features
- **Invoice Management**: Bulk JSON processing, automatic calculations, Persian date handling
- **Representative Portal**: Public access with unique IDs for invoice viewing
- **Financial Tracking**: Real-time debt, payment, and sales calculations
- **AI Integration**: Persian cultural intelligence for representative profiling and assistance
- **Data Synchronization**: Seamless sync between admin and CRM data

### Database Schema
- **representatives**: Core representative data with financial metrics
- **invoices**: Invoice records with status tracking
- **payments**: Payment allocation and tracking
- **admin_users**: Admin panel authentication
- **crm_users**: CRM panel authentication

## Technical Decisions

### Recently Removed (August 2025)
- Performance analytics endpoints and components
- Task management system and related APIs
- Dashboard overview with charts and statistics
- Bulk analysis endpoints
- Chart.js/Recharts dependencies
- Unused service files (performance-analytics-service, gamification-engine, task-management-service)

### Current API Endpoints
**CRM Routes**:
- `/api/crm/representatives` - List/create/update representatives
- `/api/crm/representatives/statistics` - Basic representative statistics
- `/api/crm/auth/*` - CRM authentication system

**AI Routes**:
- `/api/ai/profile/:id` - Generate psychological profiles
- `/api/ai/insights/:id` - Cultural insights
- `/api/ai/status` - AI engine status

**Admin Routes**: Full financial management (unchanged)

## External Dependencies
- **Neon Database**: PostgreSQL hosting
- **XAI Grok API**: Persian AI intelligence
- **Telegram Bot API**: Automated notifications
- **Drizzle ORM**: Type-safe database operations

## Performance & Stability
- Clean, optimized codebase with removed bloat
- Stable 237 representative list with proper data loading
- No continuous re-rendering issues
- Memory-efficient API calls
- Streamlined authentication flow

## Development Status
- **Phase**: Production-ready simplified system
- **Focus**: Core business functionality only
- **Maintenance**: Clean architecture for easy future development
- **Documentation**: Updated to reflect current minimal system (August 2025)

## Security
- Role-based access control maintained
- Session management with PostgreSQL backend
- Admin panel isolation from CRM operations
- Secure representative data handling

This streamlined version focuses on essential business needs while maintaining reliability and performance.