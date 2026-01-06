import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome to OpenCircle
          </h1>
          <p className="text-xl text-muted-foreground">
            Build thriving communities with decentralized, censorship-resistant communication
          </p>

          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/sign-in">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/sign-up">Create Account</Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card>
              <CardHeader>
                <CardTitle>Decentralized</CardTitle>
                <CardDescription>
                  Powered by Waku for censorship-resistant messaging
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Community-First</CardTitle>
                <CardDescription>
                  Spaces, courses, events, and discussions all in one place
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy-Focused</CardTitle>
                <CardDescription>
                  Your data, your control. Built with privacy in mind
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
