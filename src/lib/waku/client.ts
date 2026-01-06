import { createLightNode, waitForRemotePeer, createEncoder as sdkCreateEncoder, createDecoder as sdkCreateDecoder } from '@waku/sdk'
import { Protocols, type IEncoder, type IDecoder } from '@waku/interfaces'

let wakuNode: Awaited<ReturnType<typeof createLightNode>> | null = null

// Wrapper functions for encoder/decoder with type bypass
export function createEncoder(options: { contentTopic: string }): IEncoder {
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

  // Create a Light Node on mainnet
  wakuNode = await createLightNode({
    networkConfig: {
      clusterId: 1,
      shards: [0, 1, 2, 3, 4, 5, 6, 7],
    },
    defaultBootstrap: true,
  })

  await wakuNode.start()

  try {
    await Promise.race([
      waitForRemotePeer(wakuNode, [Protocols.LightPush, Protocols.Filter]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Peer connection timeout')), 30000)
      ),
    ])
    console.log('Waku mainnet node connected')
  } catch (error) {
    console.warn('Waku peer connection warning:', error)
  }

  return wakuNode
}

export async function stopWakuNode() {
  if (wakuNode) {
    await wakuNode.stop()
    wakuNode = null
  }
}
