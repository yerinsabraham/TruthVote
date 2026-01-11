'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CookiesPage() {
  const lastUpdated = 'January 10, 2026';
  const companyName = 'TruthVote';
  const companyEmail = 'info@truthvote.io';

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
          <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: {lastUpdated}</p>

          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-8">
            <p className="text-sm">
              This Cookie Policy explains how {companyName} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) uses cookies and 
              similar technologies when you visit our platform. It explains what these technologies are 
              and why we use them, as well as your rights to control our use of them.
            </p>
          </div>

          {/* What Are Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">What Are Cookies?</h2>
            <p className="mb-4">
              Cookies are small text files that are placed on your device (computer, tablet, or mobile phone) 
              when you visit a website. They are widely used to make websites work more efficiently and 
              provide information to website owners.
            </p>
            <p className="mb-4">
              Cookies can be &quot;persistent&quot; (they remain on your device until deleted or expired) or 
              &quot;session&quot; cookies (they are deleted when you close your browser).
            </p>
          </section>

          {/* How We Use Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How We Use Cookies</h2>
            <p className="mb-4">We use cookies for the following purposes:</p>
            
            <div className="space-y-4">
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 text-green-600 dark:text-green-400">
                  🔒 Essential Cookies (Required)
                </h3>
                <p className="mb-2 text-sm">
                  These cookies are necessary for the website to function properly. They cannot be disabled.
                </p>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  <li>Authentication and login session management</li>
                  <li>Security features (CSRF protection)</li>
                  <li>Load balancing and performance</li>
                  <li>Remembering your cookie consent preferences</li>
                </ul>
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 text-blue-600 dark:text-blue-400">
                  📊 Analytics Cookies
                </h3>
                <p className="mb-2 text-sm">
                  These help us understand how visitors interact with our platform.
                </p>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  <li>Page views and navigation patterns</li>
                  <li>Feature usage statistics</li>
                  <li>Error tracking and debugging</li>
                  <li>Performance monitoring</li>
                </ul>
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-400">
                  ⚙️ Preference Cookies
                </h3>
                <p className="mb-2 text-sm">
                  These remember your choices and personalize your experience.
                </p>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  <li>Theme preferences (light/dark mode)</li>
                  <li>Language settings</li>
                  <li>Display preferences</li>
                  <li>Filter and sort preferences</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Cookies We Use */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Specific Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border mb-4 text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border p-2 text-left">Cookie Name</th>
                    <th className="border border-border p-2 text-left">Purpose</th>
                    <th className="border border-border p-2 text-left">Duration</th>
                    <th className="border border-border p-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-2">__session</td>
                    <td className="border border-border p-2">Firebase authentication session</td>
                    <td className="border border-border p-2">Session</td>
                    <td className="border border-border p-2">Essential</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">firebase-auth-token</td>
                    <td className="border border-border p-2">User authentication token</td>
                    <td className="border border-border p-2">1 hour</td>
                    <td className="border border-border p-2">Essential</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">theme</td>
                    <td className="border border-border p-2">Dark/light mode preference</td>
                    <td className="border border-border p-2">1 year</td>
                    <td className="border border-border p-2">Preference</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">_ga</td>
                    <td className="border border-border p-2">Google Analytics visitor ID</td>
                    <td className="border border-border p-2">2 years</td>
                    <td className="border border-border p-2">Analytics</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">_ga_*</td>
                    <td className="border border-border p-2">Google Analytics session state</td>
                    <td className="border border-border p-2">2 years</td>
                    <td className="border border-border p-2">Analytics</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">cookie-consent</td>
                    <td className="border border-border p-2">Your cookie preferences</td>
                    <td className="border border-border p-2">1 year</td>
                    <td className="border border-border p-2">Essential</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Third-Party Cookies</h2>
            <p className="mb-4">
              Some cookies are placed by third-party services that appear on our pages:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                <strong>Google (Firebase):</strong> Authentication and analytics services.
                See <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google&apos;s Cookie Policy</a>
              </li>
              <li>
                <strong>Vercel:</strong> Hosting and performance analytics.
                See <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Vercel&apos;s Privacy Policy</a>
              </li>
            </ul>
          </section>

          {/* Similar Technologies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Similar Technologies</h2>
            <p className="mb-4">
              In addition to cookies, we may use other similar technologies:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                <strong>Local Storage:</strong> Used to store data locally in your browser 
                (e.g., user preferences, cached data for performance)
              </li>
              <li>
                <strong>Session Storage:</strong> Temporary data storage that is cleared 
                when you close your browser
              </li>
              <li>
                <strong>IndexedDB:</strong> For storing larger amounts of structured data 
                (e.g., offline functionality)
              </li>
            </ul>
          </section>

          {/* Managing Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Managing Your Cookie Preferences</h2>
            
            <h3 className="text-lg font-semibold mb-3">Browser Settings</h3>
            <p className="mb-4">
              Most browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>View what cookies are stored and delete them individually</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies from specific sites</li>
              <li>Block all cookies entirely</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>

            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold mb-2">Browser-specific instructions:</p>
              <ul className="text-sm space-y-1">
                <li>
                  <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Chrome</a>
                </li>
                <li>
                  <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Firefox</a>
                </li>
                <li>
                  <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Safari</a>
                </li>
                <li>
                  <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a>
                </li>
              </ul>
            </div>

            <h3 className="text-lg font-semibold mb-3">Opt-Out Tools</h3>
            <p className="mb-4">
              You can also opt out of certain cookies using these tools:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Analytics Opt-out Browser Add-on</a>
              </li>
              <li>
                <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Network Advertising Initiative Opt-Out</a>
              </li>
              <li>
                <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Digital Advertising Alliance Opt-Out</a>
              </li>
            </ul>
          </section>

          {/* Impact of Disabling Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Impact of Disabling Cookies</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm">
                <strong>⚠️ Please note:</strong> If you disable or delete cookies, some features of our 
                platform may not function properly:
              </p>
              <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                <li>You may not be able to stay logged in</li>
                <li>Your preferences may not be saved</li>
                <li>Some features may be unavailable</li>
                <li>You may see this cookie notice repeatedly</li>
              </ul>
            </div>
          </section>

          {/* Do Not Track */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Do Not Track Signals</h2>
            <p className="mb-4">
              Some browsers have a &quot;Do Not Track&quot; (DNT) feature that signals to websites that you 
              do not want your online activity tracked. There is currently no uniform standard for 
              how websites should respond to DNT signals.
            </p>
            <p className="mb-4">
              Currently, our platform does not respond to DNT signals. If a standard is established, 
              we will update this policy accordingly.
            </p>
          </section>

          {/* Updates */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Updates to This Policy</h2>
            <p className="mb-4">
              We may update this Cookie Policy from time to time to reflect changes in technology, 
              legislation, or our data practices. We will notify you of any material changes by 
              updating the &quot;Last Updated&quot; date at the top of this policy.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="mb-4">
              If you have questions about our use of cookies or this policy, please contact us:
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="mb-2"><strong>{companyName}</strong></p>
              <p>
                Email:{' '}
                <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a>
              </p>
            </div>
          </section>

          {/* Related Links */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">Related Documents</h3>
            <div className="flex flex-wrap gap-4">
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
