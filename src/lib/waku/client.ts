import { createLightNode, waitForRemotePeer } from '@waku/sdk'
import { Protocols } from '@waku/interfaces'
import { createEncoder as createProtoEncoder, createDecoder as createProtoDecoder } from '@waku/core'

let wakuNode: Awaited<ReturnType<typeof createLightNode>> | null = null

// Mainnet pubsub topic for cluster 1, shard 0
const PUBSUB_TOPIC = '/waku/2/rs/1/0'

export function createEncoder(options: { contentTopic: string }) {
  return (createProtoEncoder as any)({
    contentTopic: options.contentTopic,
    pubsubTopic: PUBSUB_TOPIC,
  })
}

export function createDecoder(contentTopic: string) {
  return (createProtoDecoder as any)(contentTopic, PUBSUB_TOPIC)
}

export async function getWakuNode() {
  if (wakuNode) {
    return wakuNode
  }

  wakuNode = await createLightNode({
    pubsubTopics: [PUBSUB_TOPIC],
    defaultBootstrap: true,
  })

  await wakuNode.start()

  try {
    await Promise.race([
      waitForRemotePeer(wakuNode, [Protocols.LightPush, Protocols.Filter]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000)),
    ])
    console.log('Waku connected')
  } catch (error) {
    console.warn('Waku peer warning:', error)
  }

  return wakuNode
}

export async function stopWakuNode() {
  if (wakuNode) {
    await wakuNode.stop()
    wakuNode = null
  }
}
