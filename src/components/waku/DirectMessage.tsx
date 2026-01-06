'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useWaku } from './WakuProvider'
import { getDirectMessageTopic } from '@/lib/waku/topics'
import { createEncoder, createDecoder } from '@/lib/waku/client'
import { decodeMessage, encodeMessage, type Message as WakuMessage } from '@/lib/waku/messages'
import type { IDecodedMessage } from '@waku/interfaces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

interface Message {
  timestamp: number
  sender: string
  content: string
}

interface DirectMessageProps {
  currentUserId: string
  recipientUserId: string
  recipientName: string
}

export function DirectMessage({
  currentUserId,
  recipientUserId,
  recipientName,
}: DirectMessageProps) {
  const { node, isConnected } = useWaku()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<(() => void) | null>(null)

  // Get the DM topic - ensures same topic regardless of who initiated
  const contentTopic = useMemo(
    () => getDirectMessageTopic(currentUserId, recipientUserId),
    [currentUserId, recipientUserId]
  )

  const encoder = useMemo(() => createEncoder({ contentTopic }), [contentTopic])
  const decoder = useMemo(() => createDecoder(contentTopic), [contentTopic])

  // Add message with deduplication
  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      const key = `${msg.timestamp}-${msg.sender}`
      const exists = prev.some((m) => `${m.timestamp}-${m.sender}` === key)
      if (exists) return prev
      return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp)
    })
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Set up Waku subscription and load history
  useEffect(() => {
    if (!node || !isConnected) return

    const setupDM = async () => {
      try {
        setIsLoadingHistory(true)

        // Subscribe to new messages via Filter protocol
        const { subscription } = await node.filter.subscribe([decoder], (msg: IDecodedMessage) => {
          const payload = msg.payload
          const decoded = decodeMessage(payload)
          if (decoded) {
            addMessage(decoded)
          }
        })

        subscriptionRef.current = () => subscription.unsubscribe([decoder])

        // Fetch historical messages via Store protocol
        try {
          await node.store.queryWithOrderedCallback([decoder], (msg: IDecodedMessage) => {
            const payload = msg.payload
            const decoded = decodeMessage(payload)
            if (decoded) {
              addMessage(decoded)
            }
          })
        } catch (e) {
          console.log('Store query failed (may not have Store peers):', e)
        }
      } catch (error) {
        console.error('Failed to setup DM subscription:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    setupDM()

    return () => {
      subscriptionRef.current?.()
      subscriptionRef.current = null
    }
  }, [node, isConnected, decoder, addMessage])

  const sendMessage = async () => {
    if (!node || !inputMessage.trim()) return

    try {
      setIsSending(true)
      const timestamp = Date.now()

      const payload = encodeMessage({
        timestamp,
        sender: currentUserId,
        content: inputMessage.trim(),
      })

      const result = await node.lightPush.send(encoder, { payload })

      if (result.successes.length > 0) {
        // Add our own message locally (won't receive via filter)
        addMessage({
          timestamp,
          sender: currentUserId,
          content: inputMessage.trim(),
        })
        setInputMessage('')
      } else {
        console.error('Send failed:', result.failures)
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  if (!isConnected) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Connecting to Waku network...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-2">No messages yet</p>
            <p className="text-muted-foreground text-sm">
              Start a conversation with {recipientName}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              const isMe = msg.sender === currentUserId
              return (
                <div
                  key={`${msg.timestamp}-${i}`}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    {!isMe && (
                      <p className="text-xs text-muted-foreground mb-1">{recipientName}</p>
                    )}
                    <p className="break-words">{msg.content}</p>
                    <p className="text-[10px] opacity-70 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            disabled={isSending}
          />
          <Button onClick={sendMessage} disabled={isSending || !inputMessage.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
