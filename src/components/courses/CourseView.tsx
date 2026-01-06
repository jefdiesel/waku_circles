'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Play, FileText, Headphones, Download, HelpCircle, CheckCircle2, Circle, Lock } from 'lucide-react'
import { enrollInCourse, completeLesson, type CourseWithModules, type LessonWithProgress } from '@/lib/actions/courses'

interface CourseViewProps {
  course: CourseWithModules
}

const lessonTypeIcons = {
  video: Play,
  text: FileText,
  audio: Headphones,
  download: Download,
  quiz: HelpCircle,
  assignment: FileText,
}

export function CourseView({ course }: CourseViewProps) {
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrolled, setEnrolled] = useState(course.enrolled || false)
  const [selectedLesson, setSelectedLesson] = useState<LessonWithProgress | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set(course.modules.flatMap((m) => m.lessons.filter((l) => l.completed).map((l) => l.id)))
  )

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons.size / totalLessons) * 100) : 0

  const handleEnroll = async () => {
    setIsEnrolling(true)
    try {
      await enrollInCourse(course.id)
      setEnrolled(true)
    } catch (error) {
      console.error('Failed to enroll:', error)
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleCompleteLesson = async (lessonId: string) => {
    try {
      await completeLesson(course.id, lessonId)
      setCompletedLessons((prev) => new Set([...prev, lessonId]))
    } catch (error) {
      console.error('Failed to complete lesson:', error)
    }
  }

  const renderLessonContent = (lesson: LessonWithProgress) => {
    const content = lesson.content as any

    if (lesson.lessonType === 'video') {
      // Extract video URL from content
      const videoUrl = content?.url || ''
      const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')

      if (isYouTube) {
        const videoId = videoUrl.includes('youtu.be')
          ? videoUrl.split('/').pop()
          : new URL(videoUrl).searchParams.get('v')
        return (
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )
      }

      return (
        <video src={videoUrl} controls className="w-full rounded-lg">
          Your browser does not support the video tag.
        </video>
      )
    }

    if (lesson.lessonType === 'text') {
      return (
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap">{content?.body || 'No content available'}</div>
        </div>
      )
    }

    if (lesson.lessonType === 'audio') {
      return (
        <audio src={content?.url} controls className="w-full">
          Your browser does not support the audio tag.
        </audio>
      )
    }

    if (lesson.lessonType === 'download') {
      return (
        <Button asChild>
          <a href={content?.url} download target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Download File
          </a>
        </Button>
      )
    }

    return <p className="text-muted-foreground">This lesson type is not yet supported.</p>
  }

  if (!enrolled) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{course.title}</CardTitle>
            {course.description && <CardDescription>{course.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>{course.modules.length} modules</p>
              <p>{totalLessons} lessons</p>
            </div>
            <Button onClick={handleEnroll} disabled={isEnrolling} className="w-full">
              {isEnrolling ? 'Enrolling...' : 'Enroll Now (Free)'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Course outline */}
      <div className="w-80 border-r overflow-auto p-4">
        <div className="mb-4">
          <h2 className="font-semibold text-lg mb-2">{course.title}</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{progressPercent}% complete</span>
              <span>{completedLessons.size}/{totalLessons} lessons</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        <Accordion type="multiple" defaultValue={course.modules.map((m) => m.id)} className="w-full">
          {course.modules.map((module) => (
            <AccordionItem key={module.id} value={module.id}>
              <AccordionTrigger className="text-sm font-medium">
                {module.title}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  {module.lessons.map((lesson) => {
                    const Icon = lessonTypeIcons[lesson.lessonType] || FileText
                    const isCompleted = completedLessons.has(lesson.id)
                    const isSelected = selectedLesson?.id === lesson.id

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors ${
                          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1">{lesson.title}</span>
                        {lesson.durationMinutes && (
                          <span className="text-xs text-muted-foreground">{lesson.durationMinutes}m</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto p-8">
        {selectedLesson ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{selectedLesson.title}</h1>
              {selectedLesson.durationMinutes && (
                <p className="text-sm text-muted-foreground">{selectedLesson.durationMinutes} minutes</p>
              )}
            </div>

            {renderLessonContent(selectedLesson)}

            <div className="flex items-center justify-between pt-4 border-t">
              {!completedLessons.has(selectedLesson.id) ? (
                <Button onClick={() => handleCompleteLesson(selectedLesson.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Completed</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Select a lesson to begin</h2>
              <p className="text-muted-foreground">Choose a lesson from the sidebar to start learning</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
