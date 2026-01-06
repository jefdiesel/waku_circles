import { createLightNode, waitForRemotePeer, createEncoder as sdkCreateEncoder, createDecoder as sdkCreateDecoder } from '@waku/sdk'
import { Protocols } from '@waku/interfaces'

let wakuNode: Awaited<ReturnType<typeof createLightNode>> | null = null

// Default pubsub topic for Waku
const DEFAULT_PUBSUB_TOPIC = '/waku/2/default-waku/proto'

// Wrapper functions that provide encoder/decoder with required pubsubTopic
export function createEncoder(options: { contentTopic: string }) {
  return sdkCreateEncoder({
    contentTopic: options.contentTopic,
    pubsubTopic: DEFAULT_PUBSUB_TOPIC,
  })
}

export function createDecoder(contentTopic: string) {
  return sdkCreateDecoder(contentTopic, DEFAULT_PUBSUB_TOPIC)
}

export async function getWakuNode() {
  if (wakuNode) {
    return wakuNode
  }

  // Create a Light Node with explicit bootstrap nodes
  wakuNode = await createLightNode({
    defaultBootstrap: true,
    pubsubTopics: [DEFAULT_PUBSUB_TOPIC],
  })

  // Start the node
  await wakuNode.start()

  // Wait for peers with timeout
  try {
    await Promise.race([
      waitForRemotePeer(wakuNode, [Protocols.LightPush, Protocols.Filter]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Peer connection timeout')), 30000)
      ),
    ])
    console.log('Waku node initialized and connected to peers')
  } catch (error) {
    console.warn('Waku peer connection warning:', error)
    // Continue anyway - might still work with some peers
  }

  return wakuNode
}

export async function stopWakuNode() {
  if (wakuNode) {
    await wakuNode.stop()
    wakuNode = null
    console.log('Waku node stopped')
  }
}
