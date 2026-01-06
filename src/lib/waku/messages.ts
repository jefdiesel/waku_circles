import protobuf from 'protobufjs'

// Protobuf message structure for chat messages
export const ChatMessage = new protobuf.Type('ChatMessage')
  .add(new protobuf.Field('timestamp', 1, 'uint64'))
  .add(new protobuf.Field('sender', 2, 'string'))
  .add(new protobuf.Field('content', 3, 'string'))

export interface Message {
  timestamp: number
  sender: string
  content: string
}

/**
 * Decode a Waku message payload into a ChatMessage
 */
export function decodeMessage(payload: Uint8Array | undefined): Message | null {
  if (!payload) return null

  try {
    const data = ChatMessage.decode(payload) as unknown as Message
    return {
      timestamp: Number(data.timestamp),
      sender: String(data.sender),
      content: String(data.content),
    }
  } catch (error) {
    console.error('Failed to decode message:', error)
    return null
  }
}

/**
 * Encode a ChatMessage into a protobuf payload
 */
export function encodeMessage(message: Message): Uint8Array {
  const proto = ChatMessage.create({
    timestamp: message.timestamp,
    sender: message.sender,
    content: message.content,
  })
  return ChatMessage.encode(proto).finish()
}
