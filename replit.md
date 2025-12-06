# FamVoy - Family Experience & Travel App

## Overview

FamVoy is a family-focused social platform that helps families discover, share, and connect around kid-friendly experiences and activities. The application combines experience discovery with social networking features, allowing families to browse curated activities, connect with like-minded families through "pods" (group chats), and use a Tinder-style swipe interface to find compatible families in their area.

The application is built as a mobile-first web application with a clean, modern design inspired by Airbnb, Apple Health, and Pinterest aesthetics. It features a warm color palette, generous white space, and smooth animations to create an engaging user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### December 6, 2025 - Pod Experience Curation (Pinterest-style Boards)
- **Pod Experience Board**: Each pod now has its own curated collection of experiences
  - `pod_experiences` table with podId, experienceId, addedByUserId, and unique constraint
  - Storage methods: `getPodExperiencesWithCreators()`, `addExperienceToPod()`, `removeExperienceFromPod()`, `isExperienceInPod()`
- **API Endpoints**:
  - `GET /api/pods/:id/experiences` - Returns pod's curated experiences with creator info
  - `POST /api/pods/:id/experiences` - Add experience to pod (requires pod membership)
  - `DELETE /api/pods/:podId/experiences/:experienceId` - Remove experience from pod
- **PodDetails Experiences Tab**: Shows only pod-specific experiences
  - Add button opens modal to browse and add experiences
  - Remove button (trash icon) on each experience card
  - Empty state with "Add your first experience" prompt
- **Add to Pod Button**: New FolderPlus button on ExperienceDetails page
  - Opens modal showing user's group pods to select from
  - Prevents duplicate additions with helpful error messages

### December 6, 2025 - Experience Creation Improvements
- **Photo Upload**: Experience creation now requires photo upload with preview
  - Uses authenticated upload endpoint `/api/upload` with Clerk token
  - File size limit: 5MB, preview shown before save
  - Validation prevents saving without uploaded photo
- **Location Autocomplete**: Uses Nominatim (OpenStreetMap) geocoding API
  - Debounced search as user types
  - Suggestions dropdown with selectable locations
  - Stores actual lat/lng coordinates when location selected
  - Validation prevents saving without selected location coordinates
- **Interactive Maps**: ExperienceDetails page shows Leaflet map with experience location
  - Custom green marker for experience location
  - "Get Directions" link opens Google Maps directions

### December 5, 2025 - Social Features & Messaging Upgrades
- **Comments System**: Users can add comments with 1-5 star ratings on experiences
  - `comments` table with userId, experienceId, content, rating fields
  - CommentsSection component (`/components/shared/CommentsSection.tsx`)
- **Social Sharing**: Share button on experiences uses Web Share API with clipboard fallback
- **Follow System**: Users can follow/unfollow other families
  - `follows` table for follower/following relationships
  - API routes: `POST/DELETE /api/users/:id/follow`, `GET /api/users/:id/is-following`
  - Follow counts displayed on family profiles
- **Rich Messages in Pods**: 
  - Messages now support `messageType` (text, image, experience)
  - Share experiences as rich cards in pod chat
  - Photo uploads in chat via `/api/upload` endpoint with Clerk auth
  - Experience picker modal for sharing experiences

### December 5, 2025 - Authentication & Landing Page
- Added Clerk Auth for user authentication (social login via Google)
- Created marketing landing page (`/pages/Landing.tsx`) with:
  - Hero section with "Get Started Free" CTA
  - Features section (Discover, Connect, Build Pods)
  - Benefits section (Private, Easy, Curated)
  - Call-to-action footer
- Updated database schema to support auth:
  - Added `sessions` table for session storage
  - Added `clerkId`, `email`, `firstName`, `lastName`, `profileImageUrl` to users
- Protected routes use `requireAuth()` middleware from Clerk
- Frontend uses `useAuth` hook for conditional routing (landing vs app)

## System Architecture

### Full-Stack Architecture
**Pattern**: Monorepo with separate client and server directories
- Client code in `/client` (React SPA)
- Server code in `/server` (Express API)
- Shared types and schemas in `/shared`
- Build process bundles both into `/dist`

**Rationale**: This structure provides clear separation of concerns while allowing type sharing between frontend and backend. The monorepo approach simplifies deployment and ensures consistency across the stack.

### Frontend Architecture

**Framework**: React 18 with TypeScript
- Uses Vite for development and build tooling
- Wouter for lightweight client-side routing
- No server-side rendering (SPA architecture)

**State Management**: TanStack Query (React Query)
- Server state managed through React Query with centralized cache
- Custom query functions in `/client/src/lib/queryClient.ts`
- API abstraction layer in `/client/src/lib/api.ts`

**Component Structure**:
- shadcn/ui component library (Radix UI primitives + Tailwind)
- Custom shared components in `/client/src/components/shared/`
- Layout components in `/client/src/components/layout/`
- Path aliases configured: `@/` for client src, `@shared/` for shared types

**Styling**: Tailwind CSS v4 with custom design tokens
- Custom color palette (warm-teal, warm-coral, soft-beige, charcoal)
- Two custom fonts: DM Sans (body) and Outfit (headings)
- Mobile-first responsive design (max-width: 768px for mobile detection)

**Key Design Patterns**:
- Bottom tab navigation (5 tabs: Home, Explore, Pods, Create, Profile)
- Card-based UI for experiences and pods
- Swipe gestures using Framer Motion for family matching
- Optimistic UI updates with React Query mutations

### Backend Architecture

**Framework**: Express.js with TypeScript
- RESTful API design pattern
- Session-based authentication (not JWT)
- Route handlers in `/server/routes.ts`

**Authentication**: Replit Auth via OpenID Connect
- Uses Passport.js with custom OIDC strategy
- Session storage in PostgreSQL via connect-pg-simple
- User profile linked to Replit ID
- Middleware: `isAuthenticated` for protected routes

**API Design**:
- All routes prefixed with `/api`
- Authentication routes: `/api/auth/user`, `/api/login`, `/api/logout`
- Resource routes follow REST conventions (GET, POST, PATCH, DELETE)
- Error handling returns JSON with error messages

**Data Access Layer**: 
- Storage interface pattern (`IStorage`) in `/server/storage.ts`
- Abstracts database operations from route handlers
- Methods follow naming convention: `get*`, `create*`, `update*`, `delete*`

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL dialect
- Schema definitions in `/shared/schema.ts`
- Type-safe query builder
- Zod integration for runtime validation via `drizzle-zod`

**Schema Design**:
- `users`: Family profiles with location, interests, kids info
- `experiences`: User-created activity posts with geolocation
- `pods`: Group chat entities
- `podMembers`: Many-to-many join table for pod membership
- `messages`: Chat messages within pods
- `savedExperiences`: User bookmarks for experiences
- `familyConnections`: Mutual connections between families
- `familySwipes`: Tinder-style swipe history (like/pass tracking)
- `sessions`: Express session storage

**Key Patterns**:
- Serial IDs for all primary keys
- Timestamps with `defaultNow()` for audit trails
- Foreign key relationships with `.references()`
- Array fields for interests and tips
- Geolocation stored as separate lat/lng real columns

### Development Workflow

**Build Process**:
- `npm run dev`: Runs Express server with Vite middleware (HMR enabled)
- `npm run build`: Bundles client (Vite) and server (esbuild) separately
- Server bundle uses allowlist for dependencies to reduce cold start time
- Client assets output to `/dist/public`

**Development Server**: 
- Express proxies Vite dev server in development
- HMR via WebSocket on custom path `/vite-hmr`
- Static file serving in production mode

**Type Safety**:
- Shared schema definitions ensure type consistency
- tsconfig paths for clean imports
- Strict TypeScript configuration

## External Dependencies

### Authentication & Session Management
- **Replit Auth (OpenID Connect)**: Primary authentication provider
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Passport.js**: Authentication middleware with custom OIDC strategy

### Database & ORM
- **PostgreSQL**: Primary database (provisioned via `DATABASE_URL` env var)
- **Drizzle ORM**: Type-safe SQL query builder
- **pg**: Node.js PostgreSQL client

### UI Component Library
- **Radix UI**: Headless component primitives (30+ components)
- **shadcn/ui**: Pre-styled Radix components with Tailwind
- **Lucide React**: Icon library
- **Framer Motion**: Animation library for swipe gestures and transitions

### Form & Data Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation for both client and server
- **@hookform/resolvers**: Zod resolver for React Hook Form

### Styling & Build Tools
- **Tailwind CSS v4**: Utility-first CSS framework
- **Vite**: Frontend build tool and dev server
- **esbuild**: Fast bundler for server code
- **PostCSS**: CSS processing

### Development Tools (Replit-specific)
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Code navigation tool
- **@replit/vite-plugin-dev-banner**: Development mode indicator

### API & Data Fetching
- **TanStack Query**: Server state management and caching
- **date-fns**: Date formatting and manipulation

### Deployment
- **Replit Deployment**: Hosted on Replit infrastructure
- Custom Vite plugin (`vite-plugin-meta-images.ts`) updates OpenGraph images for deployment domain
- Environment variables: `DATABASE_URL`, `SESSION_SECRET`, `REPL_ID`, `ISSUER_URL`, `NODE_ENV`