'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DocsPage() {
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
          <h1 className="text-4xl font-bold mb-2">Documentation</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Everything you need to know about using TruthVote.
          </p>

          {/* Table of Contents */}
          <section className="mb-8 bg-muted/30 border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Contents</h2>
            <ol className="list-decimal pl-6 space-y-1 text-sm">
              <li><a href="#getting-started" className="text-primary hover:underline">Getting Started</a></li>
              <li><a href="#voting" className="text-primary hover:underline">How Voting Works</a></li>
              <li><a href="#predictions" className="text-primary hover:underline">Predictions & Outcomes</a></li>
              <li><a href="#points" className="text-primary hover:underline">Points & Scoring</a></li>
              <li><a href="#ranks" className="text-primary hover:underline">Ranks & Leaderboards</a></li>
              <li><a href="#creating" className="text-primary hover:underline">Creating Predictions</a></li>
              <li><a href="#comments" className="text-primary hover:underline">Comments & Community</a></li>
              <li><a href="#profile" className="text-primary hover:underline">Your Profile</a></li>
              <li><a href="#faq" className="text-primary hover:underline">FAQ</a></li>
            </ol>
          </section>

          {/* Getting Started */}
          <section id="getting-started" className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">1. Getting Started</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to TruthVote! Here&apos;s how to get started:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li><strong>Create an account</strong> — Sign up with your email or Google account</li>
              <li><strong>Browse predictions</strong> — Explore active predictions on the home page</li>
              <li><strong>Cast your first vote</strong> — Pick a side and submit your prediction</li>
              <li><strong>Track your accuracy</strong> — Check your profile to see how you&apos;re doing</li>
            </ol>
          </section>

          {/* How Voting Works */}
          <section id="voting" className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">2. How Voting Works</h2>
            <p className="text-muted-foreground mb-4">
              Each prediction presents a question with multiple options (usually Yes/No or two outcomes). 
              To vote:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Click on the option you believe will be correct</li>
              <li>Your vote is recorded immediately and cannot be changed</li>
              <li>You can see the current vote distribution after voting</li>
              <li>Each user can only vote once per prediction</li>
            </ul>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm">
                <strong>💡 Tip:</strong> Take your time before voting—once submitted, your vote is final!
              </p>
            </div>
          </section>

          {/* Predictions & Outcomes */}
          <section id="predictions" className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">3. Predictions & Outcomes</h2>
            <p className="text-muted-foreground mb-4">
              Predictions go through several stages:
            </p>
            <div className="space-y-3">
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="font-semibold text-green-500">🟢 Active</h4>
                <p className="text-sm text-muted-foreground">Voting is open. Cast your prediction!</p>
              </div>
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="font-semibold text-yellow-500">🟡 Pending</h4>
                <p className="text-sm text-muted-foreground">Voting closed. Waiting for the outcome to be determined.</p>
              </div>
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="font-semibold text-blue-500">🔵 Resolved</h4>
                <p className="text-sm text-muted-foreground">Outcome decided. Points awarded to correct predictors.</p>
              </div>
            </div>
          </section>

          {/* Points & Scoring */}
          <section id="points" className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">4. Points & Scoring</h2>
            <p className="text-muted-foreground mb-4">
              Earn points by making accurate predictions:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li><strong>Correct prediction:</strong> +10 points (base)</li>
              <li><strong>Early voter bonus:</strong> Additional points for voting early</li>
              <li><strong>Contrarian bonus:</strong> Extra points for correct minority predictions</li>
              <li><strong>Streak bonus:</strong> Bonus for consecutive correct predictions</li>
            </ul>
            <p className="text-muted-foreground">
              Your total points contribute to your rank and leaderboard position.
            </p>
          </section>

          {/* Ranks & Leaderboards */}
          <section id="ranks" className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">5. Ranks & Leaderboards</h2>
            <p className="text-muted-foreground mb-4">
              As you accumulate points and build your track record, you&apos;ll progress through ranks:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                <span className="font-semibold text-red-500">Novice</span>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                <span className="font-semibold text-blue-500">Amateur</span>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                <span className="font-semibold text-purple-500">Analyst</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                <span className="font-semibold text-amber-500">Professional</span>
              </div>
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3 text-center">
                <span className="font-semibold text-pink-500">Expert</span>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                <span className="font-semibold text-green-500">Master</span>
              </div>
            </div>
            <p className="text-muted-foreground">
              Check the <Link href="/leaderboard" className="text-primary hover:underline">Leaderboard</Link> to 
              see how you compare to other predictors!
            </p>
          </section>

          {/* Creating Predictions */}
          <section id="creating" className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">6. Creating Predictions</h2>
            <p className="text-muted-foreground mb-4">
              Want to ask the community a question? Create your own prediction:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Click the <strong>&quot;Create&quot;</strong> button in the navigation</li>
              <li>Write a clear, specific question</li>
              <li>Define the possible outcomes</li>
              <li>Set a closing date for voting</li>
              <li>Add relevant categories and an optional image</li>
              <li>Submit for review</li>
            </ol>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-sm">
                <strong>⚠️ Note:</strong> Predictions are reviewed before going live to ensure quality and 
                compliance with our guidelines.
              </p>
            </div>
          </section>

          {/* Comments & Community */}
          <section id="comments" className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">7. Comments & Community</h2>
            <p className="text-muted-foreground mb-4">
              Engage with other predictors:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Share your reasoning in the comments section</li>
              <li>Discuss evidence and perspectives respectfully</li>
              <li>Follow other users to see their predictions</li>
              <li>Build your reputation through thoughtful participation</li>
            </ul>
          </section>

          {/* Profile */}
          <section id="profile" className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">8. Your Profile</h2>
            <p className="text-muted-foreground mb-4">
              Your profile shows:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your prediction history and accuracy rate</li>
              <li>Current rank and progress to next rank</li>
              <li>Total points earned</li>
              <li>Bio and public information</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Customize your profile in <Link href="/settings" className="text-primary hover:underline">Settings</Link>.
            </p>
          </section>

          {/* FAQ */}
          <section id="faq" className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">9. Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Can I change my vote?</h4>
                <p className="text-sm text-muted-foreground">
                  No, votes are final once submitted. This ensures the integrity of predictions.
                </p>
              </div>
              
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">How are outcomes determined?</h4>
                <p className="text-sm text-muted-foreground">
                  Outcomes are determined by admins based on verifiable real-world events and reliable sources.
                </p>
              </div>
              
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Is my voting history private?</h4>
                <p className="text-sm text-muted-foreground">
                  Your votes are public and visible on your profile. This promotes transparency and accountability.
                </p>
              </div>
              
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Can I delete my account?</h4>
                <p className="text-sm text-muted-foreground">
                  Yes, you can delete your account in Settings. Contact support if you need assistance.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Need More Help?</h2>
            <p className="text-muted-foreground mb-4">
              Can&apos;t find what you&apos;re looking for? Reach out to our support team.
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
            <h3 className="text-lg font-semibold mb-4">Related</h3>
            <div className="flex flex-wrap gap-4">
              <Link href="/about" className="text-primary hover:underline">About Us</Link>
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
