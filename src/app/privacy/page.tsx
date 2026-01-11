'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PrivacyPage() {
  const lastUpdated = 'January 10, 2026';
  const companyName = 'TruthVote';
  const companyEmail = 'info@truthvote.io';
  const supportEmail = 'info@truthvote.io';

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
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: {lastUpdated}</p>

          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-8">
            <p className="text-sm">
              {companyName} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </div>

          {/* Table of Contents */}
          <section className="mb-8 bg-muted/30 border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Contents</h2>
            <ol className="list-decimal pl-6 space-y-1 text-sm">
              <li><a href="#information-collected" className="text-primary hover:underline">Information We Collect</a></li>
              <li><a href="#how-we-use" className="text-primary hover:underline">How We Use Your Information</a></li>
              <li><a href="#legal-basis" className="text-primary hover:underline">Legal Basis for Processing (GDPR)</a></li>
              <li><a href="#sharing" className="text-primary hover:underline">Information Sharing and Disclosure</a></li>
              <li><a href="#data-retention" className="text-primary hover:underline">Data Retention</a></li>
              <li><a href="#your-rights" className="text-primary hover:underline">Your Privacy Rights</a></li>
              <li><a href="#ccpa" className="text-primary hover:underline">California Privacy Rights (CCPA/CPRA)</a></li>
              <li><a href="#gdpr" className="text-primary hover:underline">European Privacy Rights (GDPR)</a></li>
              <li><a href="#international" className="text-primary hover:underline">International Data Transfers</a></li>
              <li><a href="#security" className="text-primary hover:underline">Data Security</a></li>
              <li><a href="#children" className="text-primary hover:underline">Children&apos;s Privacy</a></li>
              <li><a href="#third-party" className="text-primary hover:underline">Third-Party Services</a></li>
              <li><a href="#cookies" className="text-primary hover:underline">Cookies and Tracking</a></li>
              <li><a href="#changes" className="text-primary hover:underline">Changes to This Policy</a></li>
              <li><a href="#contact" className="text-primary hover:underline">Contact Us</a></li>
            </ol>
          </section>

          {/* 1. Information We Collect */}
          <section id="information-collected" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Information You Provide</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Account Information:</strong> Email address, display name, password (encrypted)</li>
              <li><strong>Profile Information:</strong> Profile picture, bio, preferences you choose to share</li>
              <li><strong>User Content:</strong> Votes, comments, predictions you create or participate in</li>
              <li><strong>Communications:</strong> Messages you send to us, support requests, feedback</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Device Information:</strong> Device type, operating system, browser type and version</li>
              <li><strong>Usage Data:</strong> Pages viewed, features used, voting patterns, time spent on platform</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs, error logs</li>
              <li><strong>Location Data:</strong> General geographic location based on IP address (country/region level)</li>
              <li><strong>Cookies and Similar Technologies:</strong> See our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link></li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Information from Third Parties</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Social Login:</strong> If you sign in with Google or other providers, we receive your name, 
                  email, and profile picture as permitted by you</li>
              <li><strong>Analytics Providers:</strong> Aggregated usage statistics and demographic information</li>
            </ul>
          </section>

          {/* 2. How We Use Your Information */}
          <section id="how-we-use" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Provide Services:</strong> Operate the platform, process votes, display results</li>
              <li><strong>Personalization:</strong> Customize your experience, show relevant content</li>
              <li><strong>Communication:</strong> Send account notifications, respond to inquiries, provide support</li>
              <li><strong>Analytics:</strong> Understand usage patterns, improve features, fix bugs</li>
              <li><strong>Safety:</strong> Detect fraud, abuse, and violations of our Terms of Service</li>
              <li><strong>Legal Compliance:</strong> Comply with legal obligations and enforce our rights</li>
              <li><strong>Rankings:</strong> Calculate and display leaderboards, points, and badges</li>
            </ul>
          </section>

          {/* 3. Legal Basis for Processing */}
          <section id="legal-basis" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Legal Basis for Processing (GDPR)</h2>
            <p className="mb-4">For users in the European Economic Area, we process your data based on:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Contract:</strong> Processing necessary to provide our services to you</li>
              <li><strong>Legitimate Interests:</strong> Improving our services, fraud prevention, security</li>
              <li><strong>Consent:</strong> Where you have given explicit consent (e.g., marketing emails)</li>
              <li><strong>Legal Obligation:</strong> When required by law</li>
            </ul>
          </section>

          {/* 4. Information Sharing */}
          <section id="sharing" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
            
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <p className="font-semibold text-green-700 dark:text-green-400">
                We do NOT sell your personal information to third parties.
              </p>
            </div>

            <p className="mb-4">We may share your information with:</p>
            
            <h3 className="text-lg font-semibold mb-2">Service Providers</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Firebase (Google):</strong> Authentication, database, hosting, analytics</li>
              <li><strong>Cloud Infrastructure:</strong> Servers, storage, content delivery</li>
              <li><strong>Analytics Services:</strong> Usage tracking, performance monitoring</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Public Information</h3>
            <p className="mb-4">
              Certain information is publicly visible, including your display name, profile picture, 
              votes, comments, points, and rank. You can adjust privacy settings in your account.
            </p>

            <h3 className="text-lg font-semibold mb-2">Legal Requirements</h3>
            <p className="mb-4">
              We may disclose information when required by law, court order, or government request, 
              or to protect our rights, property, or safety.
            </p>

            <h3 className="text-lg font-semibold mb-2">Business Transfers</h3>
            <p className="mb-4">
              In the event of a merger, acquisition, or sale of assets, your information may be 
              transferred to the acquiring entity.
            </p>
          </section>

          {/* 5. Data Retention */}
          <section id="data-retention" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p className="mb-4">We retain your information for as long as:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Your account is active</li>
              <li>Needed to provide services to you</li>
              <li>Required for legal, accounting, or reporting purposes</li>
              <li>Necessary to resolve disputes or enforce agreements</li>
            </ul>
            <p className="mb-4">
              After account deletion, we may retain certain information in anonymized form for 
              analytics purposes or as required by law.
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-sm">
                <strong>Typical Retention Periods:</strong><br />
                • Account data: Duration of account + 30 days after deletion<br />
                • Voting history: Retained in anonymized form for platform statistics<br />
                • Support tickets: 2 years from resolution<br />
                • Server logs: 90 days
              </p>
            </div>
          </section>

          {/* 6. Your Privacy Rights */}
          <section id="your-rights" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Privacy Rights</h2>
            <p className="mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Restriction:</strong> Limit processing of your data</li>
              <li><strong>Objection:</strong> Object to certain types of processing</li>
              <li><strong>Withdraw Consent:</strong> Revoke consent where processing is consent-based</li>
            </ul>
            <p className="mb-4">
              To exercise these rights, please contact us at{' '}
              <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a> 
              or use the settings in your account.
            </p>
          </section>

          {/* 7. California Privacy Rights */}
          <section id="ccpa" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. California Privacy Rights (CCPA/CPRA)</h2>
            <p className="mb-4">
              If you are a California resident, you have additional rights under the California Consumer 
              Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Right to Know:</strong> What personal information we collect, use, and share</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Right to Opt-Out:</strong> Opt out of &quot;sale&quot; or &quot;sharing&quot; of personal information 
                  (Note: We do not sell your data)</li>
              <li><strong>Right to Non-Discrimination:</strong> Equal service regardless of exercising rights</li>
              <li><strong>Right to Correct:</strong> Request correction of inaccurate information</li>
              <li><strong>Right to Limit:</strong> Limit use of sensitive personal information</li>
            </ul>
            <p className="mb-4">
              To make a request, email us at{' '}
              <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a> 
              with subject line &quot;California Privacy Request.&quot;
            </p>
          </section>

          {/* 8. GDPR Rights */}
          <section id="gdpr" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. European Privacy Rights (GDPR)</h2>
            <p className="mb-4">
              If you are in the European Economic Area (EEA), United Kingdom, or Switzerland, you have 
              rights under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>All rights listed in Section 6 above</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
              <li>Right to object to automated decision-making</li>
            </ul>
            <p className="mb-4">
              <strong>Data Controller:</strong> {companyName}<br />
              <strong>Contact:</strong> {companyEmail}
            </p>
          </section>

          {/* 9. International Transfers */}
          <section id="international" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <p className="mb-4">
              Your information may be transferred to and processed in countries other than your country 
              of residence, including the United States. These countries may have different data 
              protection laws.
            </p>
            <p className="mb-4">
              We implement appropriate safeguards for international transfers, including:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Standard Contractual Clauses approved by the European Commission</li>
              <li>Contracts with service providers requiring adequate data protection</li>
              <li>Technical and organizational security measures</li>
            </ul>
          </section>

          {/* 10. Data Security */}
          <section id="security" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Data Security</h2>
            <p className="mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Encryption of data at rest</li>
              <li>Secure authentication and password hashing</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and employee training</li>
            </ul>
            <p className="mb-4">
              While we strive to protect your information, no method of transmission or storage is 
              100% secure. You are responsible for maintaining the security of your account credentials.
            </p>
          </section>

          {/* 11. Children's Privacy */}
          <section id="children" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Children&apos;s Privacy</h2>
            <p className="mb-4">
              Our Service is not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children under 13. If you are a parent or guardian 
              and believe your child has provided us with personal information, please contact us 
              at{' '}<a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a>.
            </p>
            <p className="mb-4">
              If we discover we have collected information from a child under 13, we will delete 
              that information promptly.
            </p>
          </section>

          {/* 12. Third-Party Services */}
          <section id="third-party" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Third-Party Services</h2>
            <p className="mb-4">
              We use the following third-party services that may collect information:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border mb-4">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border p-2 text-left">Service</th>
                    <th className="border border-border p-2 text-left">Purpose</th>
                    <th className="border border-border p-2 text-left">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-2">Google Firebase</td>
                    <td className="border border-border p-2">Authentication, Database, Hosting</td>
                    <td className="border border-border p-2">
                      <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Google Analytics</td>
                    <td className="border border-border p-2">Usage Analytics</td>
                    <td className="border border-border p-2">
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Vercel</td>
                    <td className="border border-border p-2">Hosting, CDN</td>
                    <td className="border border-border p-2">
                      <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 13. Cookies */}
          <section id="cookies" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Cookies and Tracking Technologies</h2>
            <p className="mb-4">
              We use cookies and similar technologies to operate and improve our Service. For detailed 
              information, please see our{' '}
              <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
            </p>
            <p className="mb-4">Types of cookies we use:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for platform functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand usage patterns</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
          </section>

          {/* 14. Changes */}
          <section id="changes" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy periodically. We will notify you of material changes by:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Posting the updated policy on our platform</li>
              <li>Updating the &quot;Last Updated&quot; date at the top</li>
              <li>Sending an email notification for significant changes</li>
            </ul>
            <p className="mb-4">
              We encourage you to review this policy regularly. Your continued use of the Service after 
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 15. Contact */}
          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="mb-2"><strong>{companyName}</strong></p>
              <p className="mb-2">
                Privacy Inquiries:{' '}
                <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a>
              </p>
              <p className="mb-2">
                General Support:{' '}
                <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>
              </p>
            </div>
          </section>

          {/* Related Links */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">Related Documents</h3>
            <div className="flex flex-wrap gap-4">
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
