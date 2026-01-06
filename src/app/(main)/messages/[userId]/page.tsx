import { db, profiles } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { DirectMessage } from '@/components/waku/DirectMessage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{
    userId: string
  }>
}

async function getRecipientProfile(userId: string) {
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
      },
    })
    return profile
  } catch (error) {
    console.error('Failed to fetch recipient profile:', error)
    return null
  }
}

async function getCurrentUserProfile(clerkId: string) {
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.clerkId, clerkId),
      columns: {
        id: true,
      },
    })
    return profile
  } catch (error) {
    console.error('Failed to fetch current user profile:', error)
    return null
  }
}

export default async function DirectMessagePage({ params }: PageProps) {
  const { userId: recipientUserId } = await params
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Get current user's profile ID
  const currentUserProfile = await getCurrentUserProfile(user.id)
  if (!currentUserProfile) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              User profile not found. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prevent messaging yourself
  if (currentUserProfile.id === recipientUserId) {
    redirect('/messages')
  }

  // Get recipient profile
  const recipient = await getRecipientProfile(recipientUserId)
  if (!recipient) {
    notFound()
  }

  const recipientName = recipient.fullName || recipient.username || 'Unknown User'

  return (
    <div className="container max-w-4xl py-8">
      <Card className="h-[calc(100vh-12rem)]">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/messages">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipient.avatarUrl || undefined} />
              <AvatarFallback>
                {recipientName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{recipientName}</CardTitle>
              {recipient.username && (
                <CardDescription>@{recipient.username}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-5rem)]">
          <DirectMessage
            currentUserId={currentUserProfile.id}
            recipientUserId={recipientUserId}
            recipientName={recipientName}
          />
        </CardContent>
      </Card>
    </div>
  )
}
