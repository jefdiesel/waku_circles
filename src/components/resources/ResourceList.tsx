'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FileText, Image, Film, Music, Archive, File, Download, Trash2 } from 'lucide-react'
import { deleteResource, type ResourceFile } from '@/lib/actions/resources'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ResourceListProps {
  resources: ResourceFile[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return Image
  if (fileType.startsWith('video/')) return Film
  if (fileType.startsWith('audio/')) return Music
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return Archive
  return File
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ResourceList({ resources }: ResourceListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    setDeletingId(id)
    try {
      await deleteResource(id)
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  if (resources.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No resources uploaded yet. Click "Upload File" to add resources.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => {
        const Icon = getFileIcon(resource.fileType)
        const uploaderName = resource.uploader.fullName || resource.uploader.username || 'Unknown'

        return (
          <Card key={resource.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{resource.fileName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatFileSize(resource.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(resource.uploadedAt)}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={resource.uploader.avatarUrl || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {uploaderName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{uploaderName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={resource.url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(resource.id)}
                    disabled={deletingId === resource.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
