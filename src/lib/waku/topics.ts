/**
 * Generate content topics for Waku messaging
 * Format: /{application-name}/{version}/{content-topic-name}/{encoding}
 */

export function getCommunityTopic(communityId: string): string {
  return `/opencircle/1/community-${communityId}/proto`
}

export function getSpaceTopic(spaceId: string): string {
  return `/opencircle/1/space-${spaceId}/proto`
}

export function getDirectMessageTopic(userId1: string, userId2: string): string {
  // Sort user IDs to ensure consistent topic regardless of sender/receiver
  const [user1, user2] = [userId1, userId2].sort()
  return `/opencircle/1/dm-${user1}-${user2}/proto`
}

export function parseContentTopic(topic: string): {
  type: 'community' | 'space' | 'dm' | 'unknown'
  id: string
} {
  const parts = topic.split('/')
  if (parts.length !== 5) {
    return { type: 'unknown', id: '' }
  }

  const [, app, version, contentTopic] = parts

  if (app !== 'opencircle' || version !== '1') {
    return { type: 'unknown', id: '' }
  }

  if (contentTopic.startsWith('community-')) {
    return {
      type: 'community',
      id: contentTopic.replace('community-', ''),
    }
  }

  if (contentTopic.startsWith('space-')) {
    return {
      type: 'space',
      id: contentTopic.replace('space-', ''),
    }
  }

  if (contentTopic.startsWith('dm-')) {
    return {
      type: 'dm',
      id: contentTopic.replace('dm-', ''),
    }
  }

  return { type: 'unknown', id: '' }
}
