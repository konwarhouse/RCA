# RCA Intelligence - AI-Powered Root Cause Analysis Platform

## Overview

This is a full-stack web application for performing AI-powered Root Cause Analysis (RCA) on uploaded data files. The system allows users to upload various file formats (CSV, Excel, PDF, JSON, TXT), analyzes them to identify potential root causes of issues, and provides intelligent recommendations with confidence scores.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **analyses** table: Stores analysis records with metadata, results, and file information
- **users** table: User authentication (schema defined but not actively used)
- Uses JSONB fields for flexible data storage (recommendations, file metadata)
- Supports search, filtering by priority, and date range queries

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
2. **Storage**: In-memory storage during processing
3. **Analysis**: Simulated AI processing with confidence scoring
4. **Results**: Root cause identification with recommendations

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