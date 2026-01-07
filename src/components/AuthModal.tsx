'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signInWithGoogle, signInWithApple, signUp } from '@/lib/firebase/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onModeToggle?: () => void;
};

type AuthStep = 'initial' | 'email-password' | 'signup-form';

export function AuthModal({ isOpen, onClose, mode, onModeToggle }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClose = () => {
    setStep('initial');
    setEmail('');
    setPassword('');
    setDisplayName('');
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      handleClose();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithApple();
      handleClose();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Apple');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailContinue = () => {
    if (mode === 'login') {
      // For login, just move to password step
      setStep('email-password');
    } else {
      // For signup, move to full signup form
      setStep('signup-form');
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      await signIn(email, password);
      handleClose();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, displayName);
      handleClose();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogTitle className="text-xl font-semibold text-center">
          {step === 'initial' && (mode === 'login' ? 'Log In' : 'Sign Up')}
          {step === 'email-password' && 'Enter Password'}
          {step === 'signup-form' && 'Create Account'}
        </DialogTitle>
        
        {/* Initial Step - Social + Email button */}
        {step === 'initial' && (
          <div className="space-y-6 py-4">
            {/* Google Sign In */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border-gray-600"
              variant="outline"
            >
              <Image
                src="/assets/google.png"
                alt="Google"
                width={20}
                height={20}
                className="mr-3"
              />
              Continue with Google
            </Button>

            {/* Apple Sign In */}
            <Button
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full h-12 bg-black hover:bg-gray-900 text-white"
            >
              <Image
                src="/assets/apple_logo_white.png"
                alt="Apple"
                width={20}
                height={20}
                className="mr-3"
              />
              Continue with Apple
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">OR</span>
              </div>
            </div>

            {/* Email Input for Login, Button for Signup */}
            {mode === 'login' ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && email) {
                      handleEmailContinue();
                    }
                  }}
                  disabled={loading}
                  className="h-12"
                />
              </div>
            ) : (
              <Button
                onClick={handleEmailContinue}
                disabled={loading}
                variant="outline"
                className="w-full h-12 border-gray-300"
              >
                <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Continue with Email
              </Button>
            )}

            {mode === 'login' && email && (
              <Button
                onClick={handleEmailContinue}
                disabled={loading}
                className="w-full"
              >
                Continue
              </Button>
            )}

            {/* Mode Toggle */}
            {onModeToggle && (
              <div className="text-center pt-2">
                <button
                  onClick={onModeToggle}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  type="button"
                >
                  {mode === 'login' ? (
                    <>
                      Don't have an account? <span className="font-semibold text-primary">Sign up</span>
                    </>
                  ) : (
                    <>
                      Already have an account? <span className="font-semibold text-primary">Log in</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Legal Terms */}
            <p className="text-xs text-center text-gray-500 pt-4">
              By continuing, you acknowledge to agree with TruthVote's{' '}
              <a href="/privacy" className="text-primary hover:underline">
                legal terms
              </a>
              , which we recommend reviewing.
            </p>
          </div>
        )}

        {/* Email + Password Step (Login) */}
        {step === 'email-password' && mode === 'login' && (
          <div className="space-y-6 py-4">
            <p className="text-sm text-gray-500 text-center">{email}</p>

            <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-12"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full h-12"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('initial')}
                disabled={loading}
                className="w-full"
              >
                Back
              </Button>
            </form>
          </div>
        )}

        {/* Full Signup Form */}
        {step === 'signup-form' && mode === 'signup' && (
          <div className="space-y-6 py-4">
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  className="h-12"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input
                  id="password-signup"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email || !password || !displayName}
                className="w-full h-12"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('initial')}
                disabled={loading}
                className="w-full"
              >
                Back
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
