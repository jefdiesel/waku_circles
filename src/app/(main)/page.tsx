import { redirect } from 'next/navigation'

export default function MainPage() {
  // Redirect to a default community
  // In a real app, you'd show a community selector or redirect to the user's last viewed community
  redirect('/demo')
}
