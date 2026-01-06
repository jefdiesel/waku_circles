/**
 * Database seed script for OpenCircle
 *
 * Run this to populate your database with initial data for development/testing
 *
 * Usage:
 *   tsx src/lib/db/seed.ts
 */

import { db } from "./index";
import {
  communities,
  membershipTiers,
  profiles,
  spaces,
  posts,
  comments,
  courses,
  courseModules,
  courseLessons,
  events,
} from "./schema";

async function seed() {
  console.log("🌱 Starting database seed...");

  // Create a sample community
  const [community] = await db
    .insert(communities)
    .values({
      name: "OpenCircle Demo Community",
      slug: "demo",
      description: "A demo community to showcase OpenCircle features",
      brandColor: "#6366f1",
      settings: {
        allowMemberInvites: true,
        requireApproval: false,
        allowPublicView: true,
        emailNotifications: true,
      },
    })
    .returning();

  console.log("✅ Created community:", community.name);

  // Create membership tiers
  const tierData = [
    {
      communityId: community.id,
      name: "Free",
      description: "Access to public spaces and basic features",
      priceCents: 0,
      billingPeriod: "monthly" as const,
      features: ["Access to public discussions", "Join events", "View resources"],
      sortOrder: 0,
    },
    {
      communityId: community.id,
      name: "Basic",
      description: "Access to all discussion spaces and courses",
      priceCents: 900, // $9.00
      billingPeriod: "monthly" as const,
      stripePriceId: "price_basic_monthly",
      features: [
        "Everything in Free",
        "Access to all discussion spaces",
        "Unlimited course access",
        "Priority support",
      ],
      sortOrder: 1,
    },
    {
      communityId: community.id,
      name: "Pro",
      description: "Full access to everything including private events",
      priceCents: 2900, // $29.00
      billingPeriod: "monthly" as const,
      stripePriceId: "price_pro_monthly",
      features: [
        "Everything in Basic",
        "Access to exclusive events",
        "Private mastermind space",
        "Downloadable resources",
        "Early access to new features",
      ],
      sortOrder: 2,
    },
  ];

  const tiers = await db.insert(membershipTiers).values(tierData).returning();
  console.log("✅ Created membership tiers:", tiers.length);

  // Create sample profiles (simulate Clerk users)
  const profileData = [
    {
      clerkId: "user_demo_admin",
      username: "admin",
      fullName: "Admin User",
      avatarUrl: "https://avatar.vercel.sh/admin",
      bio: "Community administrator",
      role: "admin" as const,
      membershipTierId: tiers[2].id, // Pro tier
    },
    {
      clerkId: "user_demo_john",
      username: "john",
      fullName: "John Doe",
      avatarUrl: "https://avatar.vercel.sh/john",
      bio: "Software developer and tech enthusiast",
      role: "member" as const,
      membershipTierId: tiers[1].id, // Basic tier
    },
    {
      clerkId: "user_demo_jane",
      username: "jane",
      fullName: "Jane Smith",
      avatarUrl: "https://avatar.vercel.sh/jane",
      bio: "Product designer and creator",
      role: "member" as const,
      membershipTierId: tiers[0].id, // Free tier
    },
  ];

  const profiles_created = await db.insert(profiles).values(profileData).returning();
  console.log("✅ Created profiles:", profiles_created.length);

  // Update community owner
  await db
    .update(communities)
    .set({ ownerId: profiles_created[0].id })
    .where({ id: community.id });

  // Create spaces
  const spaceData = [
    {
      communityId: community.id,
      name: "General",
      slug: "general",
      description: "General discussions and community updates",
      emoji: "💬",
      spaceType: "discussion" as const,
      visibility: "public" as const,
      sortOrder: 0,
    },
    {
      communityId: community.id,
      name: "Introductions",
      slug: "introductions",
      description: "Introduce yourself to the community",
      emoji: "👋",
      spaceType: "discussion" as const,
      visibility: "public" as const,
      sortOrder: 1,
    },
    {
      communityId: community.id,
      name: "Resources",
      slug: "resources",
      description: "Helpful resources and downloads",
      emoji: "📚",
      spaceType: "resources" as const,
      visibility: "public" as const,
      sortOrder: 2,
    },
    {
      communityId: community.id,
      name: "Live Chat",
      slug: "chat",
      description: "Real-time community chat (powered by Waku)",
      emoji: "⚡",
      spaceType: "chat" as const,
      visibility: "public" as const,
      sortOrder: 3,
    },
    {
      communityId: community.id,
      name: "Getting Started Course",
      slug: "getting-started",
      description: "Learn how to make the most of this community",
      emoji: "🎓",
      spaceType: "course" as const,
      visibility: "public" as const,
      sortOrder: 4,
    },
    {
      communityId: community.id,
      name: "Pro Mastermind",
      slug: "pro-mastermind",
      description: "Exclusive space for Pro members",
      emoji: "💎",
      spaceType: "discussion" as const,
      visibility: "paid" as const,
      requiredTierIds: [tiers[2].id], // Pro tier only
      sortOrder: 5,
    },
    {
      communityId: community.id,
      name: "Events",
      slug: "events",
      description: "Community events and meetups",
      emoji: "📅",
      spaceType: "events" as const,
      visibility: "public" as const,
      sortOrder: 6,
    },
  ];

  const spaces_created = await db.insert(spaces).values(spaceData).returning();
  console.log("✅ Created spaces:", spaces_created.length);

  // Create sample posts
  const generalSpace = spaces_created[0];
  const introSpace = spaces_created[1];

  const postData = [
    {
      spaceId: generalSpace.id,
      authorId: profiles_created[0].id,
      title: "Welcome to OpenCircle!",
      content:
        "# Welcome!\n\nWelcome to our community! We're excited to have you here.\n\n## What is OpenCircle?\n\nOpenCircle is an open-source community platform built with Next.js, Drizzle ORM, and modern web technologies.\n\n## Get Started\n\n1. Introduce yourself in the Introductions space\n2. Explore the different spaces\n3. Join upcoming events\n4. Check out our courses\n\nLet's build something amazing together!",
      contentFormat: "markdown" as const,
      isPinned: true,
      likesCount: 5,
      commentsCount: 2,
    },
    {
      spaceId: introSpace.id,
      authorId: profiles_created[1].id,
      title: "Hi everyone! 👋",
      content:
        "Hey! I'm John, a software developer from San Francisco. Excited to be part of this community!\n\nI'm interested in web development, open source, and building cool products.\n\nLooking forward to connecting with you all!",
      contentFormat: "markdown" as const,
      likesCount: 3,
      commentsCount: 1,
    },
    {
      spaceId: introSpace.id,
      authorId: profiles_created[2].id,
      title: "Hello from Jane!",
      content:
        "Hi! I'm Jane, a product designer based in New York.\n\nI love creating beautiful and functional user experiences. Always happy to chat about design, UX, and product development.\n\nSee you around! ✨",
      contentFormat: "markdown" as const,
      likesCount: 2,
    },
  ];

  const posts_created = await db.insert(posts).values(postData).returning();
  console.log("✅ Created posts:", posts_created.length);

  // Create sample comments
  const commentData = [
    {
      postId: posts_created[0].id,
      authorId: profiles_created[1].id,
      content: "This is awesome! Thanks for building this.",
      likesCount: 1,
    },
    {
      postId: posts_created[0].id,
      authorId: profiles_created[2].id,
      content: "Love the design! Can't wait to explore all the features.",
      likesCount: 2,
    },
    {
      postId: posts_created[1].id,
      authorId: profiles_created[2].id,
      content: "Welcome John! Nice to meet you!",
      likesCount: 1,
    },
  ];

  const comments_created = await db.insert(comments).values(commentData).returning();
  console.log("✅ Created comments:", comments_created.length);

  // Create a sample course
  const courseSpace = spaces_created.find((s) => s.spaceType === "course");

  if (courseSpace) {
    const [course] = await db
      .insert(courses)
      .values({
        spaceId: courseSpace.id,
        title: "Getting Started with OpenCircle",
        description:
          "Learn how to use all the features of OpenCircle and make the most of your community membership",
        isPublished: true,
        accessType: "free",
        settings: {
          sequentialUnlock: false,
          dripEnabled: false,
          certificateEnabled: true,
          discussionEnabled: true,
        },
      })
      .returning();

    console.log("✅ Created course:", course.title);

    // Create course modules
    const [module1] = await db
      .insert(courseModules)
      .values({
        courseId: course.id,
        title: "Introduction",
        sortOrder: 0,
      })
      .returning();

    const [module2] = await db
      .insert(courseModules)
      .values({
        courseId: course.id,
        title: "Core Features",
        sortOrder: 1,
      })
      .returning();

    console.log("✅ Created course modules:", 2);

    // Create course lessons
    const lessonData = [
      {
        moduleId: module1.id,
        title: "Welcome Video",
        lessonType: "video" as const,
        content: {
          type: "video",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          duration: 180,
          provider: "youtube",
        },
        durationMinutes: 3,
        isPreview: true,
        sortOrder: 0,
      },
      {
        moduleId: module1.id,
        title: "Community Guidelines",
        lessonType: "text" as const,
        content: {
          type: "text",
          body: "# Community Guidelines\n\nBe respectful, helpful, and kind to all members...",
          format: "markdown",
        },
        sortOrder: 1,
      },
      {
        moduleId: module2.id,
        title: "Using Discussion Spaces",
        lessonType: "video" as const,
        content: {
          type: "video",
          url: "https://www.youtube.com/watch?v=example",
          duration: 300,
          provider: "youtube",
        },
        durationMinutes: 5,
        sortOrder: 0,
      },
      {
        moduleId: module2.id,
        title: "Joining Events",
        lessonType: "text" as const,
        content: {
          type: "text",
          body: "# How to Join Events\n\n1. Navigate to the Events space\n2. Browse upcoming events\n3. Click RSVP...",
          format: "markdown",
        },
        sortOrder: 1,
      },
    ];

    await db.insert(courseLessons).values(lessonData);
    console.log("✅ Created course lessons:", lessonData.length);
  }

  // Create sample events
  const eventSpace = spaces_created.find((s) => s.spaceType === "events");

  if (eventSpace) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const eventData = [
      {
        spaceId: eventSpace.id,
        hostId: profiles_created[0].id,
        title: "Community Kickoff Call",
        description:
          "Join us for our first community call! Meet other members, ask questions, and learn what's coming next.",
        eventType: "online" as const,
        location: "https://meet.google.com/abc-defg-hij",
        startsAt: nextWeek,
        endsAt: new Date(nextWeek.getTime() + 60 * 60 * 1000), // 1 hour
        timezone: "America/New_York",
        capacity: 50,
        isPublished: true,
      },
      {
        spaceId: eventSpace.id,
        hostId: profiles_created[0].id,
        title: "Product Design Workshop",
        description:
          "A hands-on workshop covering modern product design principles and best practices.",
        eventType: "online" as const,
        location: "https://zoom.us/j/123456789",
        startsAt: nextMonth,
        endsAt: new Date(nextMonth.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        timezone: "America/New_York",
        capacity: 30,
        isPublished: true,
      },
    ];

    await db.insert(events).values(eventData);
    console.log("✅ Created events:", eventData.length);
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log("\nYou can now:");
  console.log("- Browse spaces at /demo");
  console.log("- View posts in the General space");
  console.log("- Explore the Getting Started course");
  console.log("- Check out upcoming events");
  console.log("\nHappy building! 🚀");
}

// Run seed
seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
