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
- **Enhanced Family Profiles**: Rich family profiles with team-style member display, family values, languages, pets, motto, traditions, and dream vacation destinations.
- **Booking & Checkout System**: Manually-curated booking options with Stripe checkout for trip itinerary purchases.

### Booking & Checkout System
**Database Tables**:
- `booking_options`: Curated bookable items (hotels, activities, restaurants) with pricing, linked to trip items or experiences
- `carts`: User shopping carts, optionally tied to a pod trip
- `cart_items`: Items in cart with quantity, guest count, selected date, and price snapshot
- `orders`: Completed orders with Stripe checkout session tracking
- `order_items`: Individual items in an order with confirmation codes

**Stripe Integration**:
- Uses `stripe-replit-sync` for automatic schema management and webhook handling
- Stripe client credentials fetched via Replit connection API (`/extensions/stripe/proxy`)
- Managed webhook automatically registered at `/api/stripe/webhook/{token}`
- Checkout sessions created with line items from cart, redirecting to success/cancel pages

**API Endpoints**:
- `GET /api/booking-options`: List all active booking options (filter by `?tripItemId=`)
- `POST /api/booking-options`: Create booking option (admin)
- `GET /api/cart`: Get current user's cart with items
- `POST /api/cart/items`: Add item to cart
- `DELETE /api/cart/items/:id`: Remove item from cart
- `POST /api/checkout`: Create Stripe checkout session and order
- `GET /api/orders`: List user's orders
- `POST /api/orders/:id/complete`: Finalize order after payment
- `GET /api/stripe/config`: Get Stripe publishable key

**Files**:
- `server/stripeClient.ts`: Stripe client initialization with Replit connection
- `server/webhookHandlers.ts`: Webhook event handlers for Stripe events
- `server/index.ts`: Stripe schema initialization and webhook route registration

### Trip Confirmation Wizard
**Purpose**: Sequential wizard-style flow for converting draft trips to confirmed trips. Users review trip items one-by-one, select from AI-generated booking options, and progress through each item until the full trip is confirmed (similar to Jotform's single-question view).

**Trip Status Lifecycle**: `draft` → `confirming` (wizard in progress) → `confirmed`

**Database Tables**:
- `tripConfirmationSessions`: Tracks wizard state with `tripId`, `currentItemIndex`, `requestedByUserId`, `isCompleted`
- `tripItemOptions`: AI-generated booking options per trip item with `tripItemId`, `title`, `description`, `priceEstimate`, `rating`, `bookingUrl`, `imageUrl`, `isLocked`
- `tripItems` enhanced with: `isConfirmable`, `confirmationState` (pending/locked/skipped), `selectedOptionId`
- `podTrips` enhanced with: `status` (draft/confirming/confirmed)

**AI Booking Search Service** (`server/bookingSearchService.ts`):
- Uses OpenAI GPT-4o-mini via Replit AI Integrations (no API key required)
- Generates 3 realistic booking options per trip item based on type, name, location, and date
- Options include title, description, estimated price, rating, and booking URLs
- Falls back to generated options if AI fails

**API Endpoints**:
- `POST /api/trips/:id/confirm/start`: Start confirmation wizard, sets trip status to "confirming"
- `GET /api/trips/:id/confirm/session`: Get current wizard state with progress and options
- `POST /api/trips/:tripId/items/:itemId/options/generate`: Generate/regenerate 3 booking options for an item
- `POST /api/trips/:tripId/items/:itemId/options/:optionId/lock`: Lock selected option, advance to next item
- `POST /api/trips/:tripId/items/:itemId/skip`: Skip item, mark as not confirmable
- `POST /api/trips/:id/confirm/complete`: Complete confirmation, set trip status to "confirmed"

**Authorization**: All confirmation endpoints verify the requester is a member of the trip's pod before allowing any action.

**Frontend** (`client/src/pages/TripConfirmWizard.tsx`):
- Full-screen wizard UI with progress indicator bar
- Shows current item details (type, time, notes)
- Displays 3 option cards with title, price, rating, and selection button
- Regenerate button to get new options
- Skip button to bypass items
- Auto-advance animation between items
- Completion screen with "Confirm Trip" button

**Trip Details Integration** (`client/src/pages/TripDetails.tsx`):
- "Confirm Trip" CTA button for draft trips
- "Continue Confirming" button for trips in progress
- "Confirmed" badge for completed trips

### Enhanced Family Profiles
**Database Tables**:
- `familyMembers`: Stores individual family members with fields: `id`, `userId` (FK to users), `name`, `role` (Mom/Dad/Son/Daughter/etc), `photo`, `ageGroup`, `isAdult`, `createdAt`
- `users` enhanced with: `familyValues` (array), `languages` (array), `pets`, `familyMotto`, `favoriteTraditions`, `dreamVacation`

**Family Member Roles**: Mom, Dad, Daughter, Son, Grandma, Grandpa, Aunt, Uncle, Other, Other Adult (defined in `client/src/lib/constants.ts`)
**Age Groups**: Infant (0-1), Toddler (1-3), Preschool (3-5), Elementary (5-10), Tween (10-13), Teen (13-18), Adult (18+)
**Family Values**: Adventure, Education, Nature, Creativity, Sports, Music, Travel, Community, Faith, Health, Cultural Heritage
**Languages**: English, Spanish, French, Mandarin, German, Italian, Portuguese, Japanese, Korean, Arabic, Hindi, ASL, Other

**API Endpoints**:
- `GET /api/family-members`: Get current user's family members
- `GET /api/users/:userId/family-members`: Get any user's family members
- `POST /api/family-members`: Create new family member
- `DELETE /api/family-members/:id`: Delete family member

**UI Features**:
- Team-style family member grid with circular photos grouped by Adults/Kids
- Edit mode with selectable preset values for family values and languages
- Add/delete family members with photo upload support
- Display of motto, traditions, pets, and dream vacation in profile view

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
- **Upload Flow**: Frontend gets presigned URL from `/api/objects/upload`, uploads directly to cloud storage via PUT, then confirms via `/api/objects/confirm`. Returns `/objects/{uuid}` path that persists across deployments.
- **Environment Variables**: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` are automatically set when bucket is created.