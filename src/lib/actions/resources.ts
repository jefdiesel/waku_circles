"use server";

import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { del } from "@vercel/blob";
import { getProfileByClerkId } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";

export type ResourceFile = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: Date;
  uploader: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
};

/**
 * Get resources for a space
 */
export async function getResources(spaceId: string): Promise<ResourceFile[]> {
  const filesData = await db.query.files.findMany({
    where: eq(files.metadata, { spaceId } as any),
    with: {
      uploader: {
        columns: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [desc(files.createdAt)],
  });

  return filesData.map((f) => ({
    id: f.id,
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    url: f.r2Url,
    uploadedAt: f.createdAt,
    uploader: f.uploader,
  }));
}

/**
 * Delete a resource
 */
export async function deleteResource(fileId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Get the file
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });

  if (!file) {
    throw new Error("File not found");
  }

  // Check permissions - owner or admin
  const isOwner = file.uploaderId === profile.id;
  const isAdmin = ["admin", "owner", "moderator"].includes(profile.role);

  if (!isOwner && !isAdmin) {
    throw new Error("Unauthorized");
  }

  // Delete from Vercel Blob
  await del(file.r2Url);

  // Delete from database
  await db.delete(files).where(eq(files.id, fileId));

  revalidatePath("/[community]/[space]");
  return { success: true };
}

/**
 * Get all resources (for spaces that store by spaceId in metadata)
 */
export async function getAllResources(): Promise<ResourceFile[]> {
  const filesData = await db.query.files.findMany({
    with: {
      uploader: {
        columns: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [desc(files.createdAt)],
  });

  return filesData.map((f) => ({
    id: f.id,
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    url: f.r2Url,
    uploadedAt: f.createdAt,
    uploader: f.uploader,
  }));
}
