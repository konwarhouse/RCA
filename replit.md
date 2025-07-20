# RCA Intelligence - AI-Powered Root Cause Analysis Platform

## Overview

This is a full-stack web application for performing AI-powered Root Cause Analysis (RCA) on uploaded data files. The system allows users to upload various file formats (CSV, Excel, PDF, JSON, TXT), analyzes them to identify potential root causes of issues, and provides intelligent recommendations with confidence scores.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

### Complete Evidence-First RCA Workflow Restructuring
- **Date**: January 20, 2025
- **Changes**: Fundamental architectural transformation to evidence-driven root cause analysis
  - **Evidence-First Workflow**: Complete restructuring around question-driven evidence collection before AI analysis
  - **Structured Evidence Collection**: Comprehensive 8-phase questionnaire system (Asset Context, Symptom Definition, Operating Conditions, Maintenance History, Human Factors, External Factors, Additional Evidence, Equipment-Specific Follow-ups)
  - **Evidence Engine**: New server-side engine managing structured question definitions, validation, and evidence data structuring
  - **Database Schema Updates**: Added workflowStage, evidenceData, evidenceCompletedAt fields to support new workflow stages
  - **New User Interface**: Created evidence collection page with phase-based navigation, progress tracking, and equipment-specific conditional questions
  - **Workflow Stages**: evidence_collection → analysis_ready → ai_processing → completed progression ensures comprehensive data gathering before analysis
  - **API Endpoints**: New routes for evidence collection (/api/analyses/create, /evidence/:id, /proceed-to-analysis) and evidence updates
  - **Enhanced Home Page**: Updated to promote evidence-first workflow while maintaining legacy compatibility
  - **Question Validation**: Built-in validation ensuring required evidence (equipment type, location, observed problem) before AI analysis
- **Impact**: Platform now follows systematic evidence-first approach ensuring higher accuracy, better confidence scores, and comprehensive audit trails. Users are guided through structured data collection before AI analysis begins, addressing all critical factors that influence root cause determination.

### Previous: Complete Interactive RCA Platform Implementation
- **Date**: January 19, 2025
- **Changes**: Comprehensive feature implementation to match enterprise requirements
  - **Interactive Evidence Gathering**: AI-powered questionnaire system that prompts users for missing critical information with equipment-specific questions
  - **Manual Analysis Adjustment**: Full editing interface allowing expert override of AI analysis with audit trail tracking
  - **RCA Tree Visualization**: Interactive tree and fishbone diagram views showing root causes, contributing factors, and evidence with confidence scores
  - **Professional Report Export**: Multi-format export (PDF, Word, Excel, Image) with customizable sections and professional formatting
  - **Complete Version History**: Full audit trail with versioning, change tracking, and revert capabilities
  - **Detailed Analysis Pages**: Comprehensive analysis detail view with tabbed interface for all features
  - **Enhanced Navigation**: Direct links from history to detailed analysis pages
  - **Database Persistence**: Successfully migrated from in-memory to PostgreSQL with all data preserved
  - **Admin AI Key Management**: Secure admin-only AI provider configuration with encrypted key storage, multi-provider support, and automatic fallback
- **Impact**: Platform now includes all requested enterprise features: interactive evidence gathering, manual adjustments, RCA tree visualization, downloadable reports, full auditability, and secure AI provider management

## System Architecture

The application follows a modern full-stack architecture with clear separation between client, server, and shared components:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL via Neon Database serverless
- **ORM**: Drizzle ORM with type-safe schema definitions
- **File Handling**: Multer for multipart/form-data file uploads
- **Session Management**: In-memory storage (development) with PostgreSQL session store capability

### Database Design
- **analyses** table: Enhanced with equipment-specific fields and comprehensive data storage
  - Equipment type, ID, and location tracking
  - Operating parameters (pressure, temperature, flow, vibration, power, speed)
  - Historical maintenance and performance data
  - Learning insights for predictive analysis and equipment-specific patterns
- **users** table: User authentication (schema defined but not actively used)
- Uses JSONB fields for flexible data storage (recommendations, operating parameters, learning insights)
- Supports search, filtering by priority, equipment type, and date range queries

## Implemented Features Checklist

All requested enterprise features have been successfully implemented:

### A. File Upload & Processing ✅
- ✅ Upload diverse file formats (CSV, Excel, PDF, JSON, TXT)
- ✅ Robust parsing and validation
- ✅ Drag-and-drop interface with real-time progress

### B. Interactive AI Workflow ✅
- ✅ Interactive Evidence Gathering: AI prompts for missing information with equipment-specific questions
- ✅ Manual Adjustment: Expert override capability with full audit trail
- ✅ Real-time AI processing with confidence scores
- ✅ Equipment-specific analysis (pump, motor, compressor, conveyor)

### C. Dashboard & Analytics ✅
- ✅ Overview cards: Total analyses, confidence scores, % solved, trending causes
- ✅ Visual RCA output: Tree and Fishbone/Ishikawa diagrams
- ✅ Dynamic visualization showing root cause, contributing factors, evidence, confidence ratings
- ✅ Metrics & analytics: MTBF, failure modes, action item tracking

### D. Analysis History & Auditability ✅
- ✅ Searchable and filterable table view (by date, equipment, cause, site)
- ✅ Complete versioning system with change tracking
- ✅ Full audit trail for manual adjustments and re-analyses
- ✅ Navigation to detailed analysis pages

### E. Professional Reporting ✅
- ✅ Downloadable reports: Export as PDF, Word, Excel, or image
- ✅ Customizable report sections and formatting
- ✅ Professional enterprise branding options
- ✅ Multiple export formats for different use cases

### F. Enterprise UI/UX ✅
- ✅ Modern, professional enterprise design
- ✅ Responsive layout for all screen sizes
- ✅ Intuitive navigation with clear information hierarchy
- ✅ Real-time status updates and progress indicators

### G. Database & Persistence ✅
- ✅ PostgreSQL integration with full data persistence
- ✅ Equipment-specific data storage with operating parameters
- ✅ Historical maintenance and performance tracking
- ✅ Learning insights for predictive maintenance

### H. Admin AI Key Management ✅
- ✅ Secure admin-only AI provider configuration panel
- ✅ Encrypted API key storage with backend-only access
- ✅ Multi-provider support (OpenAI, Gemini, Anthropic)
- ✅ API key testing and validation before saving
- ✅ Audit trail for all AI configuration changes
- ✅ Automatic fallback to simulation when AI unavailable
- ✅ Clear error messaging for different user types

## Key Components

### Data Flow Architecture
1. **File Upload**: Users upload files via drag-and-drop interface
2. **Analysis Processing**: Server processes files and stores analysis metadata
3. **Real-time Updates**: Client polls for analysis status updates
4. **Results Display**: Dashboard shows analytics, charts, and detailed analysis history

### UI Components Structure
- **Upload Section**: File upload with drag-and-drop, validation, and processing status
- **Dashboard Section**: Analytics overview with charts and recent analyses
- **History Section**: Searchable, filterable table of all past analyses
- **Processing Status**: Real-time progress tracking for analysis stages

### File Processing Pipeline
1. **Validation**: File type and size validation (10MB limit)
2. **Equipment Context**: Equipment type selection and operating parameter input
3. **Storage**: In-memory storage during processing with equipment-specific data
4. **Analysis**: Enhanced AI processing with equipment-specific root cause analysis
   - Parameter-based insights (temperature, pressure, vibration thresholds)
   - Equipment-specific failure patterns and recommendations
   - Learning insights generation for predictive maintenance
5. **Results**: Contextualized root cause identification with equipment-focused recommendations

## Data Flow

```
User Upload → File Validation → Analysis Processing → Database Storage → Results Display
     ↓              ↓                    ↓                  ↓              ↓
File Types:   Size/Type Check    AI Analysis Sim.    PostgreSQL      Dashboard/History
CSV, Excel,   10MB Limit        Confidence Score    Drizzle ORM     React Query
PDF, JSON,    MIME Validation   Recommendations     JSONB Fields    Real-time Updates
TXT
```

### API Endpoints
- `GET /api/analyses` - Retrieve analyses with optional filtering (search, priority, date range)
- `POST /api/analyses` - Create new analysis with file upload
- `GET /api/analytics` - Retrieve dashboard analytics and metrics

## External Dependencies

### Core Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **UI Components**: Radix UI primitives for accessibility
- **Charts**: Recharts for data visualization
- **File Upload**: react-dropzone for drag-and-drop functionality
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation

### Development Tools
- **Build**: Vite with React plugin
- **Database Migrations**: Drizzle Kit for schema management
- **TypeScript**: Strict mode with path mapping
- **Styling**: Tailwind CSS with PostCSS
- **Linting**: Built-in TypeScript checking

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **Development**: Uses tsx for TypeScript execution with hot reload
- **Production**: Compiled JavaScript with NODE_ENV=production
- **Database**: Requires `DATABASE_URL` environment variable for PostgreSQL connection

### Key Build Commands
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build (frontend + backend)
- `npm run start` - Production server
- `npm run db:push` - Apply database schema changes

### Deployment Considerations
- Server serves both API routes and static frontend files
- Database migrations must be run before starting production server
- File uploads are handled in-memory (consider persistent storage for production)
- Session management uses in-memory store (consider Redis for production scaling)

The application is designed for easy deployment on platforms like Replit, with built-in development banner support and Cartographer integration for debugging.