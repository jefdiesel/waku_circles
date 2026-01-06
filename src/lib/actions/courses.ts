"use server";

import { db } from "@/lib/db";
import { courses, courseModules, courseLessons, courseEnrollments, courseProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getProfileByClerkId } from "@/lib/db/queries";

export type LessonWithProgress = {
  id: string;
  moduleId: string;
  title: string;
  lessonType: "video" | "text" | "audio" | "download" | "quiz" | "assignment";
  content: any;
  durationMinutes: number | null;
  isPreview: boolean;
  sortOrder: number;
  completed?: boolean;
};

export type ModuleWithLessons = {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  lessons: LessonWithProgress[];
};

export type CourseWithModules = {
  id: string;
  spaceId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  accessType: "free" | "membership" | "purchase";
  priceCents: number | null;
  settings: any;
  createdAt: Date;
  modules: ModuleWithLessons[];
  enrolled?: boolean;
  progressPercent?: number;
};

/**
 * Get course for a space
 */
export async function getCourse(spaceId: string): Promise<CourseWithModules | null> {
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.spaceId, spaceId), eq(courses.isPublished, true)),
    with: {
      modules: {
        orderBy: (modules, { asc }) => [asc(modules.sortOrder)],
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.sortOrder)],
          },
        },
      },
    },
  });

  if (!course) {
    return null;
  }

  // Get current user's enrollment and progress
  const user = await currentUser();
  let enrolled = false;
  let completedLessons: Set<string> = new Set();

  if (user) {
    const profile = await getProfileByClerkId(user.id);
    if (profile) {
      // Check enrollment
      const enrollment = await db.query.courseEnrollments.findFirst({
        where: and(
          eq(courseEnrollments.courseId, course.id),
          eq(courseEnrollments.userId, profile.id)
        ),
      });
      enrolled = !!enrollment;

      // Get progress
      const progress = await db.query.courseProgress.findMany({
        where: and(
          eq(courseProgress.courseId, course.id),
          eq(courseProgress.userId, profile.id)
        ),
      });
      completedLessons = new Set(
        progress.filter((p) => p.completedAt).map((p) => p.lessonId)
      );
    }
  }

  // Calculate progress
  const totalLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  );
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons.size / totalLessons) * 100) : 0;

  return {
    ...course,
    modules: course.modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => ({
        ...l,
        completed: completedLessons.has(l.id),
      })),
    })),
    enrolled,
    progressPercent,
  };
}

/**
 * Enroll in a course
 */
export async function enrollInCourse(courseId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Check if already enrolled
  const existingEnrollment = await db.query.courseEnrollments.findFirst({
    where: and(
      eq(courseEnrollments.courseId, courseId),
      eq(courseEnrollments.userId, profile.id)
    ),
  });

  if (existingEnrollment) {
    return { success: true, message: "Already enrolled" };
  }

  await db.insert(courseEnrollments).values({
    courseId,
    userId: profile.id,
  });

  revalidatePath("/[community]/[space]");
  return { success: true };
}

/**
 * Mark a lesson as complete
 */
export async function completeLesson(courseId: string, lessonId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Check if progress exists
  const existingProgress = await db.query.courseProgress.findFirst({
    where: and(
      eq(courseProgress.courseId, courseId),
      eq(courseProgress.lessonId, lessonId),
      eq(courseProgress.userId, profile.id)
    ),
  });

  if (existingProgress) {
    await db
      .update(courseProgress)
      .set({ completedAt: new Date() })
      .where(eq(courseProgress.id, existingProgress.id));
  } else {
    await db.insert(courseProgress).values({
      courseId,
      lessonId,
      userId: profile.id,
      completedAt: new Date(),
    });
  }

  revalidatePath("/[community]/[space]");
  return { success: true };
}

/**
 * Get a single lesson
 */
export async function getLesson(lessonId: string) {
  const lesson = await db.query.courseLessons.findFirst({
    where: eq(courseLessons.id, lessonId),
    with: {
      module: {
        with: {
          course: true,
        },
      },
    },
  });

  return lesson;
}
