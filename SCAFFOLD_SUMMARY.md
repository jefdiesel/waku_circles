# OpenCircle Platform - Scaffold Summary

## Project Overview

OpenCircle is a decentralized community platform built with Next.js 15, leveraging Waku for censorship-resistant P2P messaging, Clerk for authentication, Neon for PostgreSQL database, and Cloudflare R2 for file storage.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Authentication**: Clerk
- **Database**: Neon PostgreSQL with Drizzle ORM
- **P2P Messaging**: Waku SDK
- **File Storage**: Cloudflare R2
- **Package Manager**: npm

## Installation Summary

### Core Dependencies Installed
```bash
@clerk/nextjs
@neondatabase/serverless
drizzle-orm
@waku/sdk
@waku/react
protobufjs
svix
class-variance-authority
clsx
tailwind-merge
lucide-react
@radix-ui/react-slot
@radix-ui/react-avatar
@radix-ui/react-dropdown-menu
@radix-ui/react-dialog
@radix-ui/react-tabs
@radix-ui/react-scroll-area
@radix-ui/react-separator
```

### Dev Dependencies Installed
```bash
drizzle-kit
```

## Project Structure

```
/Users/jef/circles/opencircle/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx    # Clerk sign-in page
│   │   │   └── sign-up/[[...sign-up]]/page.tsx    # Clerk sign-up page
│   │   ├── (main)/
│   │   │   ├── layout.tsx                          # App shell layout with sidebar
│   │   │   ├── page.tsx                            # Redirects to default community
│   │   │   └── [community]/
│   │   │       ├── page.tsx                        # Community home page
│   │   │       └── [space]/
│   │   │           └── page.tsx                    # Space view with chat
│   │   ├── api/
│   │   │   └── webhooks/
│   │   │       └── clerk/route.ts                  # Clerk webhook handler
│   │   ├── layout.tsx                              # Root layout with ClerkProvider
│   │   ├── page.tsx                                # Landing page
│   │   └── globals.css                             # Global styles with CSS variables
│   ├── components/
│   │   ├── ui/                                     # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   └── separator.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx                         # Navigation sidebar
│   │   │   ├── Header.tsx                          # Top header with search & user
│   │   │   └── AppShell.tsx                        # Main layout wrapper
│   │   └── waku/
│   │       ├── WakuProvider.tsx                    # Waku context provider
│   │       └── ChatRoom.tsx                        # Chat component
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                            # Drizzle client setup
│   │   │   ├── schema.ts                           # Database schema (comprehensive)
│   │   │   ├── queries.ts                          # Database queries
│   │   │   ├── migrate.ts                          # Migration runner
│   │   │   ├── seed.ts                             # Seed data
│   │   │   └── types.ts                            # Type definitions
│   │   ├── waku/
│   │   │   ├── client.ts                           # Waku node initialization
│   │   │   └── topics.ts                           # Content topic helpers
│   │   └── utils.ts                                # Utility functions (cn)
│   └── middleware.ts                               # Clerk auth middleware
├── components.json                                 # shadcn/ui config
├── .env.example                                    # Environment variables template
├── drizzle.config.ts                               # Drizzle configuration
└── package.json

```

## Database Schema

The database schema includes comprehensive tables for:

### Core Tables
- **profiles**: User profiles synced from Clerk
- **communities**: Community organizations
- **spaces**: Channels within communities (discussion, chat, course, events, resources)
- **membershipTiers**: Subscription tiers for monetization

### Content Tables
- **posts**: Discussion posts with rich content
- **comments**: Threaded comments on posts
- **reactions**: Likes and emoji reactions
- **files**: File metadata for R2 uploads

### Course Tables
- **courses**: Online courses
- **courseModules**: Course sections
- **courseLessons**: Individual lessons (video, text, audio, quiz, etc.)
- **courseProgress**: User progress tracking
- **courseEnrollments**: Course enrollments

### Event Tables
- **events**: Community events (online, in-person, livestream)
- **eventRsvps**: Event RSVPs

### System Tables
- **notifications**: User notifications
- **subscriptions**: Stripe subscription sync

## Environment Configuration

Required environment variables (see `.env.example`):

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Neon Database
DATABASE_URL=

# Cloudflare R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_BUCKET_NAME=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Key Features Implemented

### Authentication
- Clerk integration for user auth
- Protected routes with middleware
- Webhook handler for user sync
- Sign-in/Sign-up pages

### UI Components
- Complete shadcn/ui component library
- Responsive layout with sidebar navigation
- Header with search and user menu
- Dark mode support via CSS variables

### Database
- Comprehensive schema with relations
- Drizzle ORM setup
- Migration and seed utilities
- Type-safe queries

### Waku Integration
- Waku client initialization
- Content topic generation
- React context provider
- Basic chat room component (placeholder for full implementation)

## Next Steps

1. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Fill in your actual credentials
   ```

2. **Set up Clerk**:
   - Create a Clerk application
   - Configure sign-in/sign-up
   - Set up webhook endpoint

3. **Set up Neon Database**:
   - Create a Neon project
   - Run migrations: `npm run db:push`
   - Seed initial data: `npm run db:seed`

4. **Set up Cloudflare R2**:
   - Create R2 bucket
   - Generate API credentials

5. **Development**:
   ```bash
   npm run dev
   ```

6. **Implement Waku messaging**:
   - Complete protobuf message definitions
   - Implement message sending/receiving
   - Add message persistence

7. **Add features**:
   - User profiles
   - Community creation
   - Space management
   - File uploads
   - Course builder
   - Event management

## File Locations (Absolute Paths)

All created files are located under:
`/Users/jef/circles/opencircle/`

Key configuration files:
- `/Users/jef/circles/opencircle/package.json`
- `/Users/jef/circles/opencircle/components.json`
- `/Users/jef/circles/opencircle/.env.example`
- `/Users/jef/circles/opencircle/drizzle.config.ts`
- `/Users/jef/circles/opencircle/src/middleware.ts`

## Notes

- The project uses Next.js 15 with the App Router
- Tailwind CSS v4 is configured via CSS (no config file needed)
- shadcn/ui components use the "new-york" style
- Database schema is comprehensive and production-ready
- Waku integration is scaffolded but needs protobuf message implementation
- All routes are type-safe with TypeScript
