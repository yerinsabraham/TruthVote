'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to Home
            </Button>
          </Link>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">About TruthVote</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Vote on anything. Public opinion, tracked over time.
          </p>

          {/* Mission */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-muted-foreground mb-4">
              TruthVote is a platform designed to capture and track public opinion on the questions that matter. 
              We believe that understanding collective perspectives—and how they evolve—creates valuable insights 
              for individuals, communities, and society.
            </p>
            <p className="text-muted-foreground mb-4">
              Whether it&apos;s predictions about future events, opinions on current topics, or votes on everyday 
              decisions, TruthVote provides a transparent and engaging way to participate in the marketplace of ideas.
            </p>
          </section>

          {/* How It Works Summary */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-muted/30 border border-border rounded-lg p-6">
                <div className="text-3xl mb-3">🗳️</div>
                <h3 className="font-semibold mb-2">Vote</h3>
                <p className="text-sm text-muted-foreground">
                  Cast your vote on predictions and polls. Your voice matters and contributes to the collective wisdom.
                </p>
              </div>
              <div className="bg-muted/30 border border-border rounded-lg p-6">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold mb-2">Track</h3>
                <p className="text-sm text-muted-foreground">
                  Watch how opinions evolve over time. See trends, shifts, and patterns in public sentiment.
                </p>
              </div>
              <div className="bg-muted/30 border border-border rounded-lg p-6">
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="font-semibold mb-2">Compete</h3>
                <p className="text-sm text-muted-foreground">
                  Earn points for accurate predictions. Climb the leaderboard and build your reputation.
                </p>
              </div>
            </div>
          </section>

          {/* Values */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="text-primary font-bold">Transparency</span>
                <span className="text-muted-foreground">— All votes are public and verifiable. No hidden algorithms.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">Fairness</span>
                <span className="text-muted-foreground">— One person, one vote. Everyone&apos;s opinion counts equally.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">Accuracy</span>
                <span className="text-muted-foreground">— We track and reward correct predictions over time.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">Privacy</span>
                <span className="text-muted-foreground">— Your data is protected. We never sell personal information.</span>
              </li>
            </ul>
          </section>

          {/* Team */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">The Team</h2>
            <p className="text-muted-foreground">
              TruthVote was created by a team passionate about technology, data, and the power of collective intelligence. 
              We&apos;re building tools that help people understand and engage with the world around them.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Get In Touch</h2>
            <p className="text-muted-foreground mb-4">
              Have questions, feedback, or ideas? We&apos;d love to hear from you.
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p>
                Email:{' '}
                <a href="mailto:info@truthvote.io" className="text-primary hover:underline">
                  info@truthvote.io
                </a>
              </p>
            </div>
          </section>

          {/* Related Links */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">Learn More</h3>
            <div className="flex flex-wrap gap-4">
              <Link href="/docs" className="text-primary hover:underline">Documentation</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
