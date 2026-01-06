import { createLightNode, waitForRemotePeer, createEncoder as sdkCreateEncoder, createDecoder as sdkCreateDecoder } from '@waku/sdk'
import { Protocols } from '@waku/interfaces'

let wakuNode: Awaited<ReturnType<typeof createLightNode>> | null = null

// Default pubsub topic for OpenCircle
const DEFAULT_PUBSUB_TOPIC = '/waku/2/default-waku/proto'

// Wrapper functions that provide encoder/decoder with required options
export function createEncoder(options: { contentTopic: string }) {
  return sdkCreateEncoder({
    contentTopic: options.contentTopic,
  } as any) // Type assertion needed due to SDK version differences
}

export function createDecoder(contentTopic: string) {
  return (sdkCreateDecoder as any)(contentTopic) // Type assertion for SDK compatibility
}

export async function getWakuNode() {
  if (wakuNode) {
    return wakuNode
  }

  // Create a Light Node
  wakuNode = await createLightNode({
    defaultBootstrap: true,
  })

  // Start the node
  await wakuNode.start()

  // Wait for a peer with relay and store protocols
  await waitForRemotePeer(wakuNode, [
    Protocols.LightPush,
    Protocols.Filter,
  ])

  console.log('Waku node initialized and connected to peers')

  return wakuNode
}

export async function stopWakuNode() {
  if (wakuNode) {
    await wakuNode.stop()
    wakuNode = null
    console.log('Waku node stopped')
  }
}
