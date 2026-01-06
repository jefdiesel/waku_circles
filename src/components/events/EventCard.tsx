'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock, MapPin, Users, Video, Building } from 'lucide-react'
import { rsvpToEvent, removeRsvp, type EventWithHost } from '@/lib/actions/events'
import { useState } from 'react'

interface EventCardProps {
  event: EventWithHost
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function EventCard({ event }: EventCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [userRsvp, setUserRsvp] = useState(event.userRsvp)
  const [rsvpCount, setRsvpCount] = useState(event.rsvpCount || 0)

  const isPast = new Date(event.startsAt) < new Date()
  const hostName = event.host.fullName || event.host.username || 'Host'

  const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    setIsLoading(true)
    try {
      if (userRsvp === status) {
        await removeRsvp(event.id)
        setUserRsvp(null)
        setRsvpCount((prev) => Math.max(0, prev - 1))
      } else {
        const wasGoing = userRsvp === 'going'
        await rsvpToEvent(event.id, status)
        setUserRsvp(status)
        if (status === 'going' && !wasGoing) {
          setRsvpCount((prev) => prev + 1)
        } else if (status !== 'going' && wasGoing) {
          setRsvpCount((prev) => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Failed to RSVP:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={isPast ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarImage src={event.host.avatarUrl || undefined} />
                <AvatarFallback>{hostName[0]}</AvatarFallback>
              </Avatar>
              <span>Hosted by {hostName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {event.eventType === 'online' && (
              <div className="flex items-center gap-1 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                <Video className="h-3 w-3" />
                Online
              </div>
            )}
            {event.eventType === 'in_person' && (
              <div className="flex items-center gap-1 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                <Building className="h-3 w-3" />
                In Person
              </div>
            )}
            {event.eventType === 'livestream' && (
              <div className="flex items-center gap-1 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                <Video className="h-3 w-3" />
                Livestream
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.description && (
          <p className="text-muted-foreground">{event.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(event.startsAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(event.startsAt)}
              {event.endsAt && ` - ${formatTime(event.endsAt)}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {event.eventType === 'online' ? (
                <a
                  href={event.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Join Meeting
                </a>
              ) : (
                <span>{event.location}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {rsvpCount} going
              {event.capacity && ` / ${event.capacity} spots`}
            </span>
          </div>
        </div>

        {!isPast && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant={userRsvp === 'going' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleRsvp('going')}
              disabled={isLoading}
            >
              {userRsvp === 'going' ? "You're Going" : 'Going'}
            </Button>
            <Button
              variant={userRsvp === 'maybe' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleRsvp('maybe')}
              disabled={isLoading}
            >
              Maybe
            </Button>
            <Button
              variant={userRsvp === 'not_going' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleRsvp('not_going')}
              disabled={isLoading}
            >
              Can't Go
            </Button>
          </div>
        )}

        {isPast && event.recordingUrl && (
          <div className="pt-2">
            <Button variant="outline" size="sm" asChild>
              <a href={event.recordingUrl} target="_blank" rel="noopener noreferrer">
                Watch Recording
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
