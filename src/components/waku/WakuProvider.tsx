'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getWakuNode, stopWakuNode } from '@/lib/waku/client'
import type { LightNode } from '@waku/interfaces'

interface WakuContextValue {
  node: LightNode | null
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
}

const WakuContext = createContext<WakuContextValue>({
  node: null,
  isConnected: false,
  isConnecting: false,
  error: null,
})

export function useWaku() {
  return useContext(WakuContext)
}

export function WakuProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<LightNode | null>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function initWaku() {
      try {
        setIsConnecting(true)
        const wakuNode = await getWakuNode()
        if (mounted) {
          setNode(wakuNode as unknown as LightNode)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize Waku'))
          console.error('Failed to initialize Waku:', err)
        }
      } finally {
        if (mounted) {
          setIsConnecting(false)
        }
      }
    }

    initWaku()

    return () => {
      mounted = false
      stopWakuNode()
    }
  }, [])

  return (
    <WakuContext.Provider
      value={{
        node,
        isConnected: !!node && !isConnecting,
        isConnecting,
        error,
      }}
    >
      {children}
    </WakuContext.Provider>
  )
}
