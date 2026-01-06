'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSpace, getCommunityBySlug } from '@/lib/actions/spaces'
import { MessageSquare, MessageCircle, BookOpen, Calendar, FolderOpen } from 'lucide-react'
import { useEffect } from 'react'

const spaceTypes = [
  { value: 'discussion', label: 'Discussion', icon: MessageSquare, description: 'Forum-style discussions with posts and comments' },
  { value: 'chat', label: 'Chat', icon: MessageCircle, description: 'Real-time chat conversations' },
  { value: 'course', label: 'Course', icon: BookOpen, description: 'Structured learning content with modules and lessons' },
  { value: 'events', label: 'Events', icon: Calendar, description: 'Event calendar with RSVPs and reminders' },
  { value: 'resources', label: 'Resources', icon: FolderOpen, description: 'File library and resource sharing' },
] as const

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Anyone can access' },
  { value: 'private', label: 'Private', description: 'Invitation only' },
  { value: 'paid', label: 'Paid', description: 'Requires membership tier' },
] as const

const commonEmojis = ['💬', '🎯', '📚', '🎉', '🚀', '💡', '🎨', '🔥', '⭐', '🎮', '📝', '🎓']

export default function NewSpacePage() {
  const router = useRouter()
  const params = useParams()
  const communitySlug = params.community as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    emoji: '',
    spaceType: 'discussion' as const,
    visibility: 'public' as const,
    sortOrder: 0,
  })

  // Fetch community ID on mount
  useEffect(() => {
    async function fetchCommunity() {
      const result = await getCommunityBySlug(communitySlug)
      if (result.success) {
        setCommunityId(result.community.id)
      } else {
        setError('Community not found')
      }
    }
    fetchCommunity()
  }, [communitySlug])

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!communityId) {
      setError('Community not loaded')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await createSpace(communityId, formData)

    if (result.success) {
      router.push(`/${communitySlug}`)
    } else {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create a New Space</h1>
        <p className="text-muted-foreground">
          Spaces help organize different types of content in your community.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Space Details</CardTitle>
            <CardDescription>Configure your new space</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Space Type */}
            <div className="space-y-2">
              <Label htmlFor="spaceType">Space Type</Label>
              <Select
                value={formData.spaceType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, spaceType: value as any }))
                }
              >
                <SelectTrigger id="spaceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {spaceTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {spaceTypes.find((t) => t.value === formData.spaceType)?.description}
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Space Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., General Discussion"
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="e.g., general-discussion"
                required
              />
              <p className="text-sm text-muted-foreground">
                {communitySlug}/{formData.slug || 'your-space-slug'}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe what this space is for..."
                rows={3}
              />
            </div>

            {/* Emoji Picker */}
            <div className="space-y-2">
              <Label>Emoji (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, emoji }))}
                    className={`text-2xl p-2 rounded-md hover:bg-accent transition-colors ${
                      formData.emoji === emoji ? 'bg-accent ring-2 ring-primary' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, emoji: '' }))}
                  className="text-sm px-3 py-2 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                >
                  Clear
                </button>
              </div>
              {formData.emoji && (
                <p className="text-sm text-muted-foreground">
                  Selected: {formData.emoji}
                </p>
              )}
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, visibility: value as any }))
                }
              >
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {visibilityOptions.find((o) => o.value === formData.visibility)?.description}
              </p>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value) || 0,
                  }))
                }
                min={0}
              />
              <p className="text-sm text-muted-foreground">
                Lower numbers appear first in the sidebar
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 mt-6">
          <Button type="submit" disabled={isLoading || !communityId}>
            {isLoading ? 'Creating...' : 'Create Space'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${communitySlug}`)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
