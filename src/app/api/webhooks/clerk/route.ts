import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db, profiles } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error: Verification error', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, username, image_url, first_name, last_name } = evt.data

    await db.insert(profiles).values({
      clerkId: id,
      username: username || undefined,
      fullName: first_name && last_name ? `${first_name} ${last_name}` : undefined,
      avatarUrl: image_url || undefined,
    })

    console.log('User created in database:', id)
  }

  if (eventType === 'user.updated') {
    const { id, username, image_url, first_name, last_name } = evt.data

    await db
      .update(profiles)
      .set({
        username: username || undefined,
        fullName: first_name && last_name ? `${first_name} ${last_name}` : undefined,
        avatarUrl: image_url || undefined,
      })
      .where(eq(profiles.clerkId, id))

    console.log('User updated in database:', id)
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    if (id) {
      await db.delete(profiles).where(eq(profiles.clerkId, id))
      console.log('User deleted from database:', id)
    }
  }

  return new Response('Webhook processed', { status: 200 })
}
