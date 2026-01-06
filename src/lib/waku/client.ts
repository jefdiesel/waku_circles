import { createLightNode, waitForRemotePeer, createEncoder, createDecoder } from '@waku/sdk'
import { Protocols } from '@waku/interfaces'

let wakuNode: Awaited<ReturnType<typeof createLightNode>> | null = null

// Export encoder/decoder creators for use in components
export { createEncoder, createDecoder }

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
