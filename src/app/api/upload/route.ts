import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { files, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.clerkId, user.id),
  })

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const spaceId = formData.get('spaceId') as string

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Upload to Vercel Blob
  const blob = await put(file.name, file, {
    access: 'public',
  })

  // Save file metadata to database
  const [savedFile] = await db
    .insert(files)
    .values({
      uploaderId: profile.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      r2Key: blob.pathname,
      r2Url: blob.url,
      metadata: spaceId ? { spaceId } : null,
    })
    .returning()

  return NextResponse.json({
    success: true,
    file: {
      id: savedFile.id,
      name: savedFile.fileName,
      url: savedFile.r2Url,
      size: savedFile.fileSize,
      type: savedFile.fileType,
    },
  })
}
