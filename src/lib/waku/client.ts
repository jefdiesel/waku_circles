import { createLightNode, waitForRemotePeer, createEncoder as sdkCreateEncoder, createDecoder as sdkCreateDecoder } from '@waku/sdk'
import { Protocols, type IEncoder, type IDecoder } from '@waku/interfaces'

let wakuNode: Awaited<ReturnType<typeof createLightNode>> | null = null

// Wrapper functions for encoder/decoder with type bypass
export function createEncoder(options: { contentTopic: string }): IEncoder {
  // The SDK types require routingInfo but it's optional at runtime
  return (sdkCreateEncoder as any)({
    contentTopic: options.contentTopic,
  })
}

export function createDecoder(contentTopic: string): IDecoder<any> {
  return (sdkCreateDecoder as any)(contentTopic)
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
