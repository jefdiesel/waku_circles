# Package.json Additions for OpenCircle Database

Add these to your `package.json` file:

## Dependencies

```json
{
  "dependencies": {
    "drizzle-orm": "^0.29.3",
    "@neondatabase/serverless": "^0.9.0",
    "@clerk/nextjs": "^4.29.0",
    "@stripe/stripe-js": "^2.4.0",
    "stripe": "^14.11.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.11.0"
  }
}
```

## Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/lib/db/migrate.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/lib/db/seed.ts"
  }
}
```

## Installation Commands

```bash
# Install production dependencies
pnpm add drizzle-orm @neondatabase/serverless @clerk/nextjs @stripe/stripe-js stripe

# Install dev dependencies
pnpm add -D drizzle-kit tsx @types/node

# Or with npm
npm install drizzle-orm @neondatabase/serverless @clerk/nextjs @stripe/stripe-js stripe
npm install -D drizzle-kit tsx @types/node

# Or with yarn
yarn add drizzle-orm @neondatabase/serverless @clerk/nextjs @stripe/stripe-js stripe
yarn add -D drizzle-kit tsx @types/node
```

## Database Workflow

### Initial Setup

1. **Set up Neon database**
   - Create account at https://neon.tech
   - Create a new project
   - Copy the connection string

2. **Configure environment variables**
   ```bash
   DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
   ```

3. **Push schema to database**
   ```bash
   pnpm db:push
   ```
   This creates all tables, enums, and constraints in your database.

4. **Seed the database** (optional, for development)
   ```bash
   pnpm db:seed
   ```

### Development Workflow

When you make schema changes:

1. **Modify schema** in `src/lib/db/schema.ts`

2. **Generate migration**
   ```bash
   pnpm db:generate
   ```
   This creates a SQL migration file in the `drizzle/` folder

3. **Review migration**
   - Check the generated SQL in `drizzle/0001_*.sql`
   - Ensure it matches your intended changes

4. **Apply migration**
   ```bash
   pnpm db:migrate
   ```
   Or for development, you can use:
   ```bash
   pnpm db:push
   ```
   (Push skips migration files and directly syncs schema)

5. **Open Drizzle Studio** (optional, for visual database browsing)
   ```bash
   pnpm db:studio
   ```
   Opens at http://localhost:4983

### Production Deployment

1. **Generate migrations locally**
   ```bash
   pnpm db:generate
   ```

2. **Commit migration files**
   ```bash
   git add drizzle/
   git commit -m "Add migration for [feature]"
   ```

3. **Apply migrations in production**
   Add to your deployment pipeline:
   ```bash
   pnpm db:migrate
   ```
   Or run manually after deployment

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  }
}
```

## Environment Variables Reference

Create a `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://user:password@host/database"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Stripe Payments
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Cloudflare R2
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="opencircle-files"
R2_PUBLIC_URL="https://files.yourdomain.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Drizzle Studio

Drizzle Studio is a visual database browser that runs locally:

```bash
pnpm db:studio
```

Features:
- Browse all tables
- View and edit data
- Run SQL queries
- Visualize relationships
- Export data

## Migration Best Practices

1. **Always review generated migrations** before applying
2. **Test migrations on a staging database** before production
3. **Keep migrations small and focused** - one feature per migration
4. **Never modify existing migrations** after they've been applied
5. **Use transactions** for complex migrations (Drizzle does this automatically)
6. **Backup before migrating** in production

## Common Commands Quick Reference

```bash
# Push schema changes directly (dev only)
pnpm db:push

# Generate migration from schema changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio

# Seed database with sample data
pnpm db:seed
```
