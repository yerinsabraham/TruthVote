'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm">
            ← Back to Home
          </Button>
        </Link>
      </div>

      <div className="prose prose-gray max-w-none">
        <h1 className="text-4xl font-bold mb-8">Legal Terms & Privacy Policy</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Terms of Service</h2>
          <p className="mb-4">
            Welcome to TruthVote. By using our platform, you agree to the following terms:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>You must be at least 13 years old to use this service</li>
            <li>You are responsible for maintaining the confidentiality of your account</li>
            <li>You agree not to post inappropriate, offensive, or harmful content</li>
            <li>TruthVote reserves the right to remove content that violates our guidelines</li>
            <li>Points and badges are virtual and have no monetary value</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Privacy Policy</h2>
          <p className="mb-4">
            TruthVote is committed to protecting your privacy. This policy outlines how we collect and use your data:
          </p>
          
          <h3 className="text-xl font-semibold mb-3 mt-6">Information We Collect</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Account information (email, display name)</li>
            <li>Profile data you choose to provide</li>
            <li>Voting and prediction activity</li>
            <li>Comments and interactions with other users</li>
            <li>Usage data and analytics</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">How We Use Your Information</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>To provide and improve our services</li>
            <li>To calculate points, rankings, and leaderboards</li>
            <li>To communicate with you about your account</li>
            <li>To ensure platform security and prevent abuse</li>
            <li>To analyze usage patterns and improve user experience</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Data Sharing</h3>
          <p className="mb-4">
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Service providers (Firebase, Google Analytics) for platform operation</li>
            <li>Law enforcement if required by law</li>
            <li>Other users (public profile information, votes, comments)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">Your Rights</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Access your personal data</li>
            <li>Request data correction or deletion</li>
            <li>Opt out of communications</li>
            <li>Delete your account at any time</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Cookie Policy</h2>
          <p className="mb-4">
            We use cookies and similar technologies to:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Keep you signed in</li>
            <li>Remember your preferences</li>
            <li>Understand how you use our platform</li>
            <li>Improve security</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Content Guidelines</h2>
          <p className="mb-4">
            When creating predictions or commenting, please:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Be respectful and civil</li>
            <li>Avoid hate speech, harassment, or threats</li>
            <li>Don&apos;t spam or post misleading information</li>
            <li>Respect intellectual property rights</li>
            <li>Don&apos;t share personal information of others</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Changes to These Terms</h2>
          <p className="mb-4">
            We may update these terms from time to time. We&apos;ll notify users of significant changes via email or platform notifications.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="mb-4">
            If you have questions about these terms or our privacy practices, please contact us at:
          </p>
          <p className="mb-4">
            Email: <a href="mailto:support@truthvote.com" className="text-primary hover:underline">support@truthvote.com</a>
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
