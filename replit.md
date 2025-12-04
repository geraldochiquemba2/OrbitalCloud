# AngoCloud - Cloud Storage Platform

## Overview

AngoCloud is a cloud storage platform for Angolan users, offering secure, accessible file storage with tiered plans from 20GB free to unlimited enterprise storage. It features modern file management (upload, download, organize, share, trash recovery) and prioritizes resilience, client-side encryption, and scalability across multiple deployment environments. The platform's business vision is to provide a cost-effective, robust cloud storage solution leveraging innovative backend technology.

## User Preferences

Preferred communication style: Simple, everyday language (Português).

## System Architecture

### Frontend

Built with React 18+ and TypeScript, using Vite, Wouter, and TailwindCSS v4 with custom design tokens. State management is handled by React Query (server state) and React Context API (authentication). UI components are based on Shadcn/ui (Radix UI), enhanced with Framer Motion for animations and Lucide React for iconography. Client-side AES-256-GCM encryption with PBKDF2 ensures zero-knowledge privacy for uploaded files, with automatic decryption on download and secure key sharing for encrypted files.

### Backend

An Express.js (Node.js) application using session-based authentication with `express-session` and `connect-pg-simple` for PostgreSQL session storage. Passport.js with LocalStrategy and SHA-256 handles authentication. Multer middleware supports file uploads up to 2GB. The core innovation is leveraging the Telegram Bot API as a cost-effective, resilient storage backend, distributing load across multiple Telegram bots. The RESTful API includes retry mechanisms with exponential backoff, automatic bot fallback with health checks, and intelligent Telegram rate limit handling.

### Data Storage

PostgreSQL, provided by Neon serverless database, is managed with Drizzle ORM. The schema includes `users` (with quotas), `files` (metadata, Telegram references, soft delete), `folders` (public sharing via `isPublic`, `publicSlug`, `publishedAt`), `shares`, and `payments`. Relationships enforce referential integrity, with cascade deletion and soft delete for trash functionality.

### Public Folders

Users can share folders publicly via custom links (`/p/{slug}`). These folders display file listings, allow guest media preview and downloads without login. Encrypted files are excluded from public folders. Toggling a folder's public status triggers automatic client-side decryption/re-encryption and re-upload of affected files.

### System Design Choices

The architecture supports scalability through multiple Telegram Bots (up to 10 for load distribution and resilience), PostgreSQL indexing, and options for server scaling. It includes a robust retry/fallback system for file operations, a monitoring system for health checks and quota management, and an interface ready for fallback storage providers like Cloudflare R2 and Backblaze B2.

### Storage Limits

- **Free Storage:** 20GB per user
- **Max File Size:** 2GB per file
- **Upload Limit:** Unlimited (subject to storage quota)

### Monitoring & Alerting

The system provides real-time health checks for Telegram bots, daily user quota tracking, automatic alert generation, admin API endpoints for monitoring dashboards, and error rate analysis.

### WebSocket Real-Time Features

A WebSocket server provides real-time updates for file operations (upload, delete, restore), folder events, storage quota changes, and notifications. This is disabled in development mode to avoid conflicts with Vite's HMR.

### Large File Download (Streaming)

Supports streaming downloads up to 2GB. The backend provides chunk metadata and individual chunks. The frontend employs different strategies:
- **Chrome/Edge Desktop (File System Access API):** True streaming to disk, ideal for large files.
- **V2 Encrypted Files (Chrome/Edge):** Stream-decrypts chunks directly to disk without memory limits.
- **Other Browsers (Safari, Firefox, Mobile):** Uses Blob accumulation, managed by the browser for files up to ~1GB.
- **V1 Encrypted Files (Legacy):** Limited by browser memory (200MB mobile, 500MB desktop) due to full-buffer decryption.

Chunk sizes are 10MB for upload and 19MB for download from Telegram.

### Admin Maintenance

Admin endpoints exist for cleaning up expired upload sessions and viewing related statistics.

## External Dependencies

- **Cloud Storage Backend:** Telegram Bot API (requires `TELEGRAM_BOT_X_TOKEN` and `TELEGRAM_CHAT_ID_X`).
- **Database Service:** Neon PostgreSQL serverless database (`DATABASE_URL`).
- **Payment Integration:** Multicaixa Express (planned).
- **Deployment Platform:** Cloudflare Workers with integrated Assets (configured in `cloudflare/`).