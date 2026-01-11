'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last Updated: {lastUpdated}</p>

          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-8">
            <p className="text-sm">
              <strong>Important:</strong> Please read these Terms of Service carefully before using {companyName}. 
              By accessing or using our platform, you agree to be bound by these terms. If you do not agree, 
              please do not use our services.
            </p>
          </div>

          {/* 1. Acceptance of Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing or using {companyName} (the &quot;Service&quot;), you agree to be bound by these Terms of Service 
              (&quot;Terms&quot;), our Privacy Policy, and all applicable laws and regulations. These Terms constitute a 
              legally binding agreement between you and {companyName} (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
            </p>
            <p className="mb-4">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by 
              posting the updated Terms on our platform and updating the &quot;Last Updated&quot; date. Your continued use 
              of the Service after such modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 2. Eligibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
            <p className="mb-4">
              To use {companyName}, you must:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Be at least 13 years of age (or the minimum age required in your jurisdiction)</li>
              <li>If under 18, have parental or guardian consent to use the Service</li>
              <li>Have the legal capacity to enter into a binding agreement</li>
              <li>Not be prohibited from using the Service under applicable laws</li>
              <li>Not have been previously banned or removed from the Service</li>
            </ul>
            <p className="mb-4">
              By using {companyName}, you represent and warrant that you meet all eligibility requirements.
            </p>
          </section>

          {/* 3. Account Registration */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration and Security</h2>
            <p className="mb-4">
              To access certain features, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Not share your account credentials with others</li>
              <li>Immediately notify us of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
            <p className="mb-4">
              We reserve the right to suspend or terminate accounts that violate these Terms or for any other 
              reason at our sole discretion.
            </p>
          </section>

          {/* 4. Description of Service */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Description of Service</h2>
            <p className="mb-4">
              {companyName} is a public opinion and voting platform that allows users to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Vote on various topics and questions</li>
              <li>Track public opinion over time</li>
              <li>Participate in community discussions through comments</li>
              <li>Earn virtual points and badges based on participation</li>
              <li>View leaderboards and user rankings</li>
            </ul>
            <p className="mb-4">
              <strong>Important Disclaimers:</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>{companyName} is NOT a gambling, betting, or prediction market platform</li>
              <li>All points, badges, and rankings are virtual and have NO monetary value</li>
              <li>Points cannot be exchanged for cash, prizes, or any real-world value</li>
              <li>Voting results are for entertainment and informational purposes only</li>
              <li>We do not guarantee the accuracy of any predictions or outcomes</li>
            </ul>
          </section>

          {/* 5. User Content */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. User-Generated Content</h2>
            <p className="mb-4">
              You may submit content including votes, comments, profile information, and other materials 
              (&quot;User Content&quot;). By submitting User Content, you:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                Grant {companyName} a worldwide, non-exclusive, royalty-free, transferable license to use, 
                reproduce, modify, display, and distribute your User Content in connection with the Service
              </li>
              <li>Represent that you own or have the necessary rights to submit the content</li>
              <li>Acknowledge that User Content may be visible to other users</li>
              <li>Understand that we may remove or modify User Content at our discretion</li>
            </ul>
            <p className="mb-4">
              You retain ownership of your User Content, subject to the license granted above.
            </p>
          </section>

          {/* 6. Prohibited Conduct */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Prohibited Conduct</h2>
            <p className="mb-4">
              You agree NOT to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Post content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, 
                  obscene, or otherwise objectionable</li>
              <li>Engage in hate speech or discrimination based on race, ethnicity, religion, gender, 
                  sexual orientation, disability, or other protected characteristics</li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
              <li>Spam, advertise, or solicit without authorization</li>
              <li>Attempt to manipulate votes or rankings through automated means, multiple accounts, 
                  or coordinated behavior</li>
              <li>Use bots, scrapers, or automated tools without permission</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to any systems or data</li>
              <li>Collect or harvest user information without consent</li>
              <li>Encourage or assist others in violating these Terms</li>
            </ul>
          </section>

          {/* 7. Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property Rights</h2>
            <p className="mb-4">
              The Service, including its design, features, content, logos, and trademarks, is owned by 
              {companyName} and protected by intellectual property laws. You may not:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Copy, modify, or distribute our proprietary content without permission</li>
              <li>Use our trademarks or branding without written consent</li>
              <li>Reverse engineer or attempt to extract source code from the Service</li>
              <li>Remove any copyright or proprietary notices</li>
            </ul>
          </section>

          {/* 8. DMCA */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Copyright Infringement (DMCA)</h2>
            <p className="mb-4">
              We respect intellectual property rights and will respond to valid notices of alleged 
              copyright infringement under the Digital Millennium Copyright Act (DMCA).
            </p>
            <p className="mb-4">
              To submit a DMCA takedown notice, please send the following information to {companyEmail}:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Identification of the copyrighted work claimed to be infringed</li>
              <li>Identification of the allegedly infringing material and its location</li>
              <li>Your contact information</li>
              <li>A statement of good faith belief that use is not authorized</li>
              <li>A statement under penalty of perjury that the information is accurate</li>
              <li>Your physical or electronic signature</li>
            </ul>
          </section>

          {/* 9. Disclaimer of Warranties */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="mb-4 uppercase font-semibold">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
                EITHER EXPRESS OR IMPLIED.
              </p>
              <p className="mb-4">
                TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT 
                LIMITED TO:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>WARRANTIES OF NON-INFRINGEMENT</li>
                <li>WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE</li>
                <li>WARRANTIES REGARDING THE ACCURACY OR RELIABILITY OF ANY CONTENT</li>
              </ul>
              <p>
                YOU USE THE SERVICE AT YOUR OWN RISK. WE DO NOT WARRANT THAT RESULTS FROM USING 
                THE SERVICE WILL BE ACCURATE OR RELIABLE.
              </p>
            </div>
          </section>

          {/* 10. Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="mb-4 uppercase font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, {companyName.toUpperCase()} AND ITS OFFICERS, DIRECTORS, 
                EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                <li>ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL</li>
                <li>ANY DAMAGES ARISING FROM YOUR USE OR INABILITY TO USE THE SERVICE</li>
                <li>ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE</li>
              </ul>
              <p className="mb-4">
                IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED ONE HUNDRED DOLLARS ($100) OR THE AMOUNT 
                YOU PAID US IN THE PAST TWELVE MONTHS, WHICHEVER IS GREATER.
              </p>
              <p>
                SOME JURISDICTIONS DO NOT ALLOW LIMITATIONS ON IMPLIED WARRANTIES OR LIABILITY FOR 
                INCIDENTAL DAMAGES, SO SOME OF THE ABOVE MAY NOT APPLY TO YOU.
              </p>
            </div>
          </section>

          {/* 11. Indemnification */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="mb-4">
              You agree to indemnify, defend, and hold harmless {companyName}, its affiliates, officers, 
              directors, employees, and agents from any claims, damages, losses, liabilities, costs, 
              and expenses (including attorneys&apos; fees) arising from:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Your use of the Service</li>
              <li>Your User Content</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your violation of any applicable laws</li>
            </ul>
          </section>

          {/* 12. Dispute Resolution */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Dispute Resolution</h2>
            <p className="mb-4">
              <strong>Informal Resolution:</strong> Before filing a formal dispute, you agree to contact us 
              at {supportEmail} to attempt to resolve the issue informally. We will work in good faith to 
              resolve your concerns.
            </p>
            <p className="mb-4">
              <strong>Binding Arbitration:</strong> If informal resolution fails, any dispute arising from 
              these Terms or your use of the Service shall be resolved through binding arbitration, 
              rather than in court, except that you may assert claims in small claims court if eligible.
            </p>
            <p className="mb-4">
              <strong>Class Action Waiver:</strong> YOU AGREE THAT ANY ARBITRATION OR PROCEEDING SHALL BE 
              LIMITED TO THE DISPUTE BETWEEN US AND YOU INDIVIDUALLY. YOU WAIVE ANY RIGHT TO PARTICIPATE 
              IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
            </p>
          </section>

          {/* 13. Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
            <p className="mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the State of 
              Delaware, United States, without regard to its conflict of law provisions. Any legal action 
              or proceeding shall be brought exclusively in the courts located in Delaware.
            </p>
          </section>

          {/* 14. Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your access to the Service immediately, without prior notice, for:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Violation of these Terms</li>
              <li>Conduct that we believe is harmful to other users or the Service</li>
              <li>Legal or regulatory requirements</li>
              <li>Any other reason at our sole discretion</li>
            </ul>
            <p className="mb-4">
              You may terminate your account at any time through your account settings. Upon termination, 
              your right to use the Service will immediately cease.
            </p>
          </section>

          {/* 15. Severability */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Severability</h2>
            <p className="mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall 
              be limited or eliminated to the minimum extent necessary, and the remaining provisions shall 
              remain in full force and effect.
            </p>
          </section>

          {/* 16. Entire Agreement */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">16. Entire Agreement</h2>
            <p className="mb-4">
              These Terms, together with our Privacy Policy and any other policies referenced herein, 
              constitute the entire agreement between you and {companyName} regarding your use of the 
              Service and supersede all prior agreements.
            </p>
          </section>

          {/* 17. Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">17. Contact Information</h2>
            <p className="mb-4">
              For questions about these Terms, please contact us at:
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="mb-2"><strong>{companyName}</strong></p>
              <p className="mb-2">Email: <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a></p>
              <p>Support: <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a></p>
            </div>
          </section>

          {/* Related Links */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">Related Documents</h3>
            <div className="flex flex-wrap gap-4">
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
