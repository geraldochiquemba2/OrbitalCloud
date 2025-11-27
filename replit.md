# AngoCloud - Cloud Storage Platform

## Overview

AngoCloud é uma plataforma de armazenamento em nuvem projetada para fornecer armazenamento de arquivos seguro e acessível para usuários angolanos. A aplicação oferece planos de armazenamento em camadas, começando com 15GB de armazenamento gratuito, com camadas pagas até armazenamento empresarial ilimitado. A plataforma possui uma interface moderna com recursos de gerenciamento de arquivos, incluindo upload, download, organização, compartilhamento e recuperação de lixeira.

## Status Atual

**Backend MVP Completo (Novembro 2024)**
- ✅ Sistema de autenticação completo (registro, login, logout, sessões)
- ✅ Banco de dados PostgreSQL com schema completo
- ✅ API RESTful para gerenciamento de arquivos e pastas
- ✅ Integração com Telegram Bot API para armazenamento
- ✅ Sistema de quotas de armazenamento por plano
- ✅ Compartilhamento de arquivos via links
- ✅ Frontend conectado com backend real

## User Preferences

Preferred communication style: Simple, everyday language (Português).

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server, chosen for fast HMR and optimized production builds
- Wouter for client-side routing (lightweight alternative to React Router)
- TailwindCSS v4 for utility-first styling with custom design tokens

**State Management**
- React Query (TanStack Query) for server state management and caching
- React Context API for authentication state and user session management
- Local component state using React hooks for UI-specific state

**UI Component Library**
- Shadcn/ui components built on Radix UI primitives for accessibility
- Custom components including 3D card effects, video backgrounds, and cloud scene animations
- Framer Motion for page transitions and interactive animations
- Lucide React for consistent iconography

**Design System**
- Space Grotesk and DM Sans fonts for modern typography
- Custom CSS variables for theming with light/dark mode support
- Component variants using class-variance-authority (CVA)
- Responsive breakpoints with mobile-first approach

### Backend Architecture

**Server Framework**
- Express.js for HTTP server and API routing
- Node.js runtime with ES modules
- Session-based authentication using express-session with connect-pg-simple for PostgreSQL session storage

**Authentication & Authorization**
- Passport.js with LocalStrategy for email/password authentication
- SHA-256 password hashing (Note: Consider migrating to bcrypt for production)
- Session-based authentication with secure cookie management
- User roles and storage quota enforcement at the database level

**File Upload & Storage**
- Multer middleware for handling multipart/form-data file uploads
- Memory storage with 2GB file size limit per upload
- Telegram Bot API as the underlying storage backend (novel approach to avoid traditional cloud storage costs)
- Multiple bot support for load distribution across Telegram bots
- File metadata stored in PostgreSQL with references to Telegram file IDs

**API Design**
- RESTful API endpoints under `/api` prefix
- JSON request/response format
- Express middleware for request logging and error handling
- CORS configuration for cross-origin requests

### Data Storage

**Database**
- PostgreSQL via Neon serverless database
- Drizzle ORM for type-safe database queries and migrations
- WebSocket connection pooling using @neondatabase/serverless with ws library

**Schema Design**
- `users`: User accounts with email, password hash, storage limits and usage tracking
- `files`: File metadata including name, size, MIME type, Telegram file references, soft delete flag
- `folders`: Hierarchical folder structure with parent-child relationships
- `shares`: Shareable links with optional password protection and expiration
- `payments`: Payment history and subscription management

**Data Relationships**
- Cascade deletion: Files and folders are deleted when parent user is deleted
- Soft delete: Files marked as deleted (isDeleted flag) for trash/recovery functionality
- Foreign key constraints ensure referential integrity

### External Dependencies

**Cloud Storage Backend**
- Telegram Bot API for file storage (requires multiple bot tokens via environment variables: `TELEGRAM_BOT_1_TOKEN`, `TELEGRAM_BOT_2_TOKEN`, etc.)
- Load balancing across bots using round-robin selection
- Supports uploads and downloads through Telegram's infrastructure

**Database Service**
- Neon PostgreSQL serverless database
- Environment variable `DATABASE_URL` required for connection
- WebSocket support for efficient connection management

**Payment Integration**
- Multicaixa Express integration planned for Angolan payment processing (implementation in progress)
- Payment tiers: Free (15GB), Plus (100GB/Kz 2,500), Pro (500GB/Kz 7,500), Empresas (Unlimited/Kz 25,000)

**Development Tools**
- Replit-specific plugins for development experience (cartographer, dev banner, runtime error modal)
- Custom Vite plugin for OpenGraph image metadata injection based on deployment URL

**Build & Deployment**
- esbuild for server-side bundling with selective dependency bundling
- Vite for client-side bundling with code splitting
- Static file serving from Express in production
- Environment-aware configuration (development/production modes)