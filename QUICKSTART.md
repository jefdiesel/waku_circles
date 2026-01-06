# OpenCircle Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm package manager
- Clerk account (free tier available)
- Neon PostgreSQL account (free tier available)
- Cloudflare account with R2 access (optional for now)

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
cd /Users/jef/circles/opencircle
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the following:

#### Clerk Setup
1. Go to https://clerk.com and create an account
2. Create a new application
3. Copy your publishable and secret keys:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
4. Set up a webhook endpoint:
   - URL: `https://your-domain.com/api/webhooks/clerk` (use ngrok for local dev)
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret:
     ```
     CLERK_WEBHOOK_SECRET=whsec_...
     ```

#### Neon Database Setup
1. Go to https://neon.tech and create an account
2. Create a new project
3. Copy the connection string:
   ```
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

#### App URL
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Database

Run Drizzle migrations:

```bash
npm run db:push
```

(Optional) Seed the database with sample data:

```bash
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### 5. Test the Application

1. Click "Create Account" to sign up
2. Complete the Clerk sign-up flow
3. You'll be redirected to the main app
4. Explore the demo community and spaces

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (main)/            # Main app (protected)
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   └── waku/              # Waku messaging components
└── lib/
    ├── db/                # Database (Drizzle)
    └── waku/              # Waku client
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Drizzle Studio
```

## Key Features

### Implemented
- User authentication (Clerk)
- Landing page
- Sign in/Sign up pages
- Protected routes
- App shell with sidebar navigation
- Database schema (comprehensive)
- Waku client setup
- Basic UI components

### To Be Implemented
- Full Waku messaging with protobuf
- Community creation
- Space management
- File uploads (Cloudflare R2)
- Course builder
- Event management
- User profiles
- Search functionality

## Troubleshooting

### Build Errors
If you encounter build errors, ensure all environment variables are set:
```bash
# Check if .env file exists and has all required variables
cat .env
```

### Database Connection Issues
Verify your Neon connection string includes `?sslmode=require`

### Clerk Issues
- Ensure webhook endpoint is accessible (use ngrok for local development)
- Check that all required events are subscribed in Clerk dashboard

### Waku Connection Issues
Waku requires WebRTC and websockets. Ensure your browser supports these technologies.

## Next Steps

1. **Customize the schema**: Edit `src/lib/db/schema.ts` to match your needs
2. **Implement Waku messaging**: Complete the protobuf definitions and message handling
3. **Add community features**: Build out community creation and management
4. **Set up file storage**: Configure Cloudflare R2 for uploads
5. **Deploy**: Deploy to Vercel or your preferred hosting platform

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Waku Documentation](https://docs.waku.org)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## Support

For issues or questions:
- Check the SCAFFOLD_SUMMARY.md for detailed architecture information
- Review the database schema in src/lib/db/schema.ts
- Consult the official documentation for each technology
