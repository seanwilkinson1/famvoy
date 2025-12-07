# FamVoy - Family Experience & Travel App

## Overview

FamVoy is a family-focused social platform designed to help families discover, share, and connect through kid-friendly experiences and activities. It integrates experience discovery with social networking, enabling users to browse curated activities, form "pods" (group chats) with like-minded families, and find compatible families locally using a swipe interface. The application is a mobile-first web app with a clean, modern design inspired by Airbnb, Apple Health, and Pinterest, featuring a warm color palette, ample white space, and smooth animations for an engaging user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture
**Pattern**: Monorepo with a React SPA client (`/client`) and an Express.js API server (`/server`), sharing types and schemas (`/shared`). This structure ensures clear separation of concerns, type consistency, and simplified deployment.

### Frontend Architecture
**Framework**: React 18 with TypeScript, using Vite for tooling and Wouter for routing.
**State Management**: TanStack Query (React Query) for server state management and caching.
**Component Structure**: Utilizes shadcn/ui (built on Radix UI and Tailwind CSS) for components, with custom shared and layout components. Path aliases are configured for easy imports.
**Styling**: Tailwind CSS v4 with a custom warm color palette and two custom fonts (DM Sans, Outfit). Designed with a mobile-first responsive approach.
**Key Design Patterns**: Features bottom tab navigation, card-based UI, Framer Motion for swipe gestures, and optimistic UI updates.

### Backend Architecture
**Framework**: Express.js with TypeScript, implementing a RESTful API design.
**Authentication**: Replit Auth via OpenID Connect using Passport.js, with session storage in PostgreSQL (`connect-pg-simple`). Protected routes use `isAuthenticated` middleware.
**API Design**: All routes are prefixed with `/api`, follow REST conventions, and include JSON-formatted error handling.
**Data Access Layer**: An `IStorage` interface abstracts database operations, ensuring a clean separation from route handlers.

### Database Architecture
**ORM**: Drizzle ORM with PostgreSQL dialect, using schema definitions in `/shared/schema.ts` and Zod for validation.
**Schema Design**: Includes tables for `users`, `experiences`, `pods`, `podMembers`, `messages`, `savedExperiences`, `familyConnections`, `familySwipes`, `sessions`, `comments`, `follows`, `pod_experiences`, `pod_albums`, `album_photos`, `badges`, `user_badges`, `pod_trips`, and `trip_items`.
**Key Patterns**: Uses serial IDs, `defaultNow()` timestamps, foreign key relationships, array fields for interests, and separate lat/lng columns for geolocation.

### Development Workflow
**Build Process**: `npm run dev` for development with HMR, `npm run build` for production bundling of client (Vite) and server (esbuild).
**Type Safety**: Ensured through shared schema definitions, `tsconfig` paths, and strict TypeScript configuration.

### System Features and Implementations
- **AI-Powered Trip Planning**: Pods can collaboratively plan trips with AI-generated itineraries using OpenAI GPT-4o-mini.
- **Pod Photo Albums**: Each pod can create and manage photo albums.
- **Badge System**: Gamified achievements for user engagement.
- **Pod Experience Curation**: Pinterest-style boards for pods to curate experiences.
- **Experience Creation Improvements**: Includes photo upload with preview, Nominatim (OpenStreetMap) location autocomplete, and interactive Leaflet maps.
- **Social Features**: Comments with ratings, social sharing, and a user follow system.
- **Rich Messages in Pods**: Support for text, image, and experience-sharing in chat.
- **Authentication**: Implemented with Clerk Auth for user authentication and social login.
- **Object Storage**: Migrated photo uploads to Replit Object Storage (Google Cloud Storage) for persistence.

## External Dependencies

### Authentication & Session Management
- **Replit Auth**: Primary authentication provider (OpenID Connect).
- **Clerk Auth**: User authentication for social login (Google).
- **connect-pg-simple**: PostgreSQL session store.
- **Passport.js**: Authentication middleware.

### Database & ORM
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Type-safe SQL query builder.
- **pg**: Node.js PostgreSQL client.

### UI Component Library
- **Radix UI**: Headless component primitives.
- **shadcn/ui**: Pre-styled Radix components with Tailwind.
- **Lucide React**: Icon library.
- **Framer Motion**: Animation library.

### Form & Data Validation
- **React Hook Form**: Form state management.
- **Zod**: Schema validation.
- **@hookform/resolvers**: Zod resolver for React Hook Form.

### Styling & Build Tools
- **Tailwind CSS v4**: Utility-first CSS framework.
- **Vite**: Frontend build tool and dev server.
- **esbuild**: Server code bundler.
- **PostCSS**: CSS processing.

### API & Data Fetching
- **TanStack Query**: Server state management and caching.
- **date-fns**: Date formatting and manipulation.
- **Nominatim (OpenStreetMap)**: Geocoding API for location autocomplete.
- **OpenAI GPT-4o-mini**: AI model for itinerary generation via Replit AI Integrations.
- **Leaflet**: Interactive maps for experience locations.

### Object Storage
- **Replit Object Storage (Google Cloud Storage)**: For persistent photo uploads.