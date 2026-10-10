// R2 replacement for @vercel/blob (bucket "opencircle-blob", binding BLOB).
// Files are served publicly by /api/files/<key> (Vercel Blob uploads were public too).
import { getCloudflareContext } from '@opennextjs/cloudflare'

type R2Object = {
  body: ReadableStream
  httpEtag: string
  writeHttpMetadata(h: Headers): void
}
type R2Like = {
  get(key: string): Promise<R2Object | null>
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>
  delete(key: string): Promise<void>
}

export async function blobBucket(): Promise<R2Like> {
  const { env } = await getCloudflareContext({ async: true })
  return (env as unknown as { BLOB: R2Like }).BLOB
}

export async function put(name: string, file: File): Promise<{ pathname: string; url: string }> {
  const key = `${crypto.randomUUID()}/${name}`
  await (await blobBucket()).put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })
  return { pathname: key, url: `/api/files/${key.split('/').map(encodeURIComponent).join('/')}` }
}

export async function del(urlOrKey: string): Promise<void> {
  const key = urlOrKey.startsWith('/api/files/')
    ? urlOrKey.slice('/api/files/'.length).split('/').map(decodeURIComponent).join('/')
    : urlOrKey
  await (await blobBucket()).delete(key)
}
