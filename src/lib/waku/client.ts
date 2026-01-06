// Waku client is now handled by waku-trollbox package
// This file kept for backwards compatibility with DirectMessage component

import { createLightNode, waitForRemotePeer } from '@waku/sdk'
import { Protocols } from '@waku/interfaces'

let wakuNode: Awaited<ReturnType<typeof createLightNode>> | null = null

export function createEncoder(options: { contentTopic: string }) {
  // Stub - Trollbox handles this now
  return { contentTopic: options.contentTopic } as any
}

export function createDecoder(contentTopic: string) {
  // Stub - Trollbox handles this now
  return { contentTopic } as any
}

export async function getWakuNode() {
  if (wakuNode) return wakuNode

  wakuNode = await createLightNode({ defaultBootstrap: true })
  await wakuNode.start()

  try {
    await Promise.race([
      waitForRemotePeer(wakuNode, [Protocols.LightPush, Protocols.Filter]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000)),
    ])
  } catch (e) {
    console.warn('Waku:', e)
  }

  return wakuNode
}

export async function stopWakuNode() {
  if (wakuNode) {
    await wakuNode.stop()
    wakuNode = null
  }
}
