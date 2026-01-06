import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'

export default async function MainPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Redirect to default community
  redirect('/home')
}
