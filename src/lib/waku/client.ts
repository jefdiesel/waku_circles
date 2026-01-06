import { createLightNode, waitForRemotePeer, createEncoder as sdkCreateEncoder, createDecoder as sdkCreateDecoder } from '@waku/sdk'
import { Protocols, type IEncoder, type IDecoder } from '@waku/interfaces'

let wakuNode: Awaited<ReturnType<typeof createLightNode>> | null = null

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

  // Mainnet cluster ID is 1, testnet is 0
  wakuNode = await createLightNode({
    networkConfig: { clusterId: 1 } as any,
    defaultBootstrap: true,
  })

  await wakuNode.start()

  try {
    await Promise.race([
      waitForRemotePeer(wakuNode, [Protocols.LightPush, Protocols.Filter]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 30000)
      ),
    ])
    console.log('Waku mainnet connected')
  } catch (error) {
    console.warn('Waku:', error)
  }

  return wakuNode
}

export async function stopWakuNode() {
  if (wakuNode) {
    await wakuNode.stop()
    wakuNode = null
  }
}
