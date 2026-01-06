'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useWaku } from './WakuProvider'
import { getSpaceTopic } from '@/lib/waku/topics'
import { createEncoder, createDecoder } from '@/lib/waku/client'
import { decodeMessage, encodeMessage, type Message as WakuMessage } from '@/lib/waku/messages'
import type { IDecodedMessage } from '@waku/interfaces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Message {
  id: string
  content: string
  author: string
  timestamp: number
}

interface ChatRoomProps {
  spaceId: string
  currentUserId: string
}

export function ChatRoom({ spaceId, currentUserId }: ChatRoomProps) {
  const { node, isConnected } = useWaku()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const subscriptionRef = useRef<(() => void) | null>(null)

  // Create encoder and decoder for this space's content topic
  const contentTopic = useMemo(() => getSpaceTopic(spaceId), [spaceId])
  const encoder = useMemo(() => createEncoder({ contentTopic }), [contentTopic])
  const decoder = useMemo(() => createDecoder(contentTopic), [contentTopic])

  // Add message with deduplication
  const addMessage = useCallback((msg: WakuMessage) => {
    setMessages((prev) => {
      // Create unique key from timestamp and sender
      const key = `${msg.timestamp}-${msg.sender}`
      const exists = prev.some((m) => `${m.timestamp}-${m.author}` === key)
      if (exists) return prev

      // Convert WakuMessage to Message and add to state
      const newMessage: Message = {
        id: key,
        content: msg.content,
        author: msg.sender,
        timestamp: msg.timestamp,
      }
      return [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp)
    })
  }, [])

  useEffect(() => {
    if (!node || !isConnected) return

    const setup = async () => {
      try {
        setIsLoading(true)
        console.log('Setting up message subscription for space:', spaceId)

        // Subscribe to new messages via Filter protocol
        const unsubscribe = await node.filter.subscribe([decoder], (msg: IDecodedMessage) => {
          const decoded = decodeMessage(msg.payload)
          if (decoded) {
            addMessage(decoded)
          }
        })

        // Store unsubscribe function for cleanup
        subscriptionRef.current = typeof unsubscribe === 'function'
          ? unsubscribe
          : () => { /* noop if subscription format changed */ }

        // Fetch historical messages via Store protocol
        try {
          await node.store.queryWithOrderedCallback([decoder], (msg: IDecodedMessage) => {
            const decoded = decodeMessage(msg.payload)
            if (decoded) {
              addMessage(decoded)
            }
          })
        } catch (e) {
          console.log('Store query failed (may not have Store peers):', e)
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Setup error:', error)
        setIsLoading(false)
      }
    }

    setup()

    return () => {
      // Cleanup subscription when component unmounts or dependencies change
      subscriptionRef.current?.()
      subscriptionRef.current = null
    }
  }, [node, isConnected, spaceId, decoder, addMessage])

  const sendMessage = async () => {
    if (!node || !inputMessage.trim() || isSending) return

    try {
      setIsSending(true)

      const timestamp = Date.now()
      const wakuMessage: WakuMessage = {
        timestamp,
        sender: currentUserId,
        content: inputMessage.trim(),
      }

      // Encode the message using protobuf
      const payload = encodeMessage(wakuMessage)

      // Send via LightPush protocol
      const result = await node.lightPush.send(encoder, { payload })

      if (result.successes.length > 0) {
        // Add our own message locally (won't receive via filter subscription)
        addMessage(wakuMessage)
        setInputMessage('')
      } else {
        console.error('Send failed:', result.failures)
        throw new Error('Failed to send message to any peer')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  if (!isConnected || isLoading) {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground">
          {!isConnected ? 'Connecting to Waku network...' : 'Loading messages...'}
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-center">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className="p-3">
              <div className="font-medium text-sm">{message.author}</div>
              <div className="mt-1">{message.content}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            disabled={isSending}
          />
          <Button onClick={sendMessage} disabled={isSending || !inputMessage.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
