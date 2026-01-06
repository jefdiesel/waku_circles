import { db, profiles } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare } from 'lucide-react'

async function getUsers() {
  try {
    // Fetch all profiles except system/demo users
    // In a real app, you might filter by community membership or recent contacts
    const users = await db.query.profiles.findMany({
      columns: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
      },
      orderBy: (profiles, { asc }) => [asc(profiles.fullName)],
    })

    return users
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return []
  }
}

export default async function MessagesPage() {
  const users = await getUsers()

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Direct Messages
          </CardTitle>
          <CardDescription>
            Private peer-to-peer conversations via Waku (not stored in database)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/messages/${user.id}`}
                  className="block p-4 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>
                        {user.fullName
                          ?.split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {user.fullName || user.username || 'Unknown User'}
                      </p>
                      {user.username && user.fullName && (
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
