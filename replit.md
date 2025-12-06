# FamVoy - Family Experience & Travel App

## Overview

FamVoy is a family-focused social platform that helps families discover, share, and connect around kid-friendly experiences and activities. The application combines experience discovery with social networking features, allowing families to browse curated activities, connect with like-minded families through "pods" (group chats), and use a Tinder-style swipe interface to find compatible families in their area.

The application is built as a mobile-first web application with a clean, modern design inspired by Airbnb, Apple Health, and Pinterest aesthetics. It features a warm color palette, generous white space, and smooth animations to create an engaging user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### December 6, 2025 - AI-Powered Trip Planning
- **Trip Planning System**: Pods can now collaboratively plan family trips
  - `pod_trips` table with name, destination, startDate, endDate, aiSummary, createdByUserId
  - `trip_items` table with dayNumber, dayTitle, time, title, description, itemType, sortOrder, experienceId
  - Item types: ACTIVITY (teal), MEAL (orange), STAY (blue), TRANSPORT (gray)
  - Storage methods: `createTrip()`, `getTripById()`, `getTripsByPod()`, `updateTrip()`, `deleteTrip()`
  - Trip item methods: `createTripItem()`, `updateTripItem()`, `deleteTripItem()`, `bulkCreateTripItems()`, `clearTripItems()`
- **API Endpoints**:
  - `GET /api/pods/:id/trips` - List trips for a pod
  - `GET /api/trips/:id` - Get trip with all items
  - `POST /api/pods/:id/trips` - Create new trip
  - `PATCH /api/trips/:id` - Update trip details
  - `DELETE /api/trips/:id` - Delete trip
  - `POST /api/trips/:id/generate` - AI-generate full itinerary based on pod member interests
  - `POST /api/trips/:id/regenerate-day/:dayNumber` - Regenerate a single day with fresh ideas
  - `POST /api/trips/:id/items` - Add single activity
  - `POST /api/trips/:id/items/bulk` - Add multiple activities
  - `PATCH /api/trip-items/:id` - Update activity
  - `DELETE /api/trip-items/:id` - Delete activity
- **AI Itinerary Generation**: Uses OpenAI GPT-4o-mini via Replit AI Integrations
  - Generates personalized multi-day itineraries based on pod members' interests and children's ages
  - Creates AI summary explaining how trip caters to all families
  - Suggests 4-6 activities per day with times, descriptions, and types
  - Can incorporate pod's saved experiences into the itinerary
- **Trips Tab in PodDetails**: New tab showing pod's trip plans
  - Trip cards with destination, dates, and AI indicator
  - Create trip modal with name, destination, date range
- **TripDetails Page** (`/trip/:id`): Full trip view and editing
  - AI summary banner at top
  - Day-by-day timeline view with activity cards
  - Color-coded activity types with icons
  - "Generate with AI" button for empty trips
  - "Regenerate" button for existing itineraries
  - Per-day regeneration for fresh ideas
  - Add/edit/delete individual activities
  - Add from pod's saved experiences directly

### December 6, 2025 - Pod Photo Albums & Badge System
- **Pod Photo Albums**: Each pod can have multiple photo albums for organizing memories
  - `pod_albums` table with name, description, createdByUserId, coverPhotoUrl
  - `album_photos` table with photoUrl, caption, addedByUserId
  - Storage methods: `getAlbumsByPod()`, `createAlbum()`, `deleteAlbum()`, `addPhotoToAlbum()`, `deletePhoto()`
  - API routes: GET/POST/DELETE `/api/pods/:id/albums`, GET/POST `/api/albums/:id/photos`, DELETE `/api/album-photos/:id`
- **Albums Tab in PodDetails**: New tab to browse and manage pod photo albums
  - Create album modal with name and description fields
  - Album grid view with cover photos and photo counts
  - Album detail view with photo grid and upload functionality
  - Delete album and delete photo actions
- **Badge/Achievement System**: Gamified achievements for user engagement
  - `badges` table with predefined achievements (Park Explorer, Social Butterfly, Pod Leader, etc.)
  - `user_badges` table to track earned badges per user with earnedAt timestamps
  - 10 initial badge types with criteria (experience_count, category_count, pod_count)
  - Storage methods: `getAllBadges()`, `getUserBadges()`, `awardBadgeToUser()`, `checkAndAwardBadges()`
  - API routes: GET `/api/badges`, GET `/api/users/:id/badges`, POST `/api/users/:id/check-badges`
- **Badges Tab on Profile**: New tab showing earned badges with emoji icons and earned dates
  - Badge grid with "Soft Pop" design aesthetic
  - Empty state encouraging activity to earn badges

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