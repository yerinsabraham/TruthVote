// src/app/settings/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { updateProfile, deleteUser, EmailAuthProvider, reauthenticateWithCredential, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function SettingsPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Report issue states
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState('bug');
  const [reportMessage, setReportMessage] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Initialize form values when userProfile loads
  useState(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setBio(userProfile.bio || '');
    }
  });

  // Redirect if not logged in
  if (!authLoading && !user) {
    router.push('/login');
    return null;
  }

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName.trim() || user.displayName,
      });
      
      // Update Firestore profile
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim() || userProfile?.displayName,
        bio: bio.trim(),
      });
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;
    
    setDeleting(true);
    try {
      // Re-authenticate user first (required for account deletion)
      const providerData = user.providerData[0];
      
      if (providerData?.providerId === 'google.com') {
        // Re-authenticate with Google
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }
      // For email users, we'd need password - skip for now as most users are OAuth
      
      const batch = writeBatch(db);
      
      // Delete user's votes
      const votesQuery = query(collection(db, 'votes'), where('userId', '==', user.uid));
      const votesSnapshot = await getDocs(votesQuery);
      votesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete user's bookmarks
      const bookmarksQuery = query(collection(db, 'bookmarks'), where('userId', '==', user.uid));
      const bookmarksSnapshot = await getDocs(bookmarksQuery);
      bookmarksSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete user's comments
      const commentsQuery = query(collection(db, 'comments'), where('userId', '==', user.uid));
      const commentsSnapshot = await getDocs(commentsQuery);
      commentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete user document
      batch.delete(doc(db, 'users', user.uid));
      
      // Commit batch delete
      await batch.commit();
      
      // Delete Firebase Auth account
      await deleteUser(user);
      
      toast.success('Account deleted successfully');
      router.push('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign in again before deleting your account');
      } else {
        toast.error(error.message || 'Failed to delete account');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!user || !reportMessage.trim()) return;
    
    setSubmittingReport(true);
    try {
      // Save report to Firestore
      const { addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'support_reports'), {
        userId: user.uid,
        userEmail: user.email,
        userName: userProfile?.displayName || user.displayName || 'Unknown',
        type: reportType,
        message: reportMessage.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
      });
      
      toast.success('Report submitted successfully! We\'ll get back to you soon.');
      setReportMessage('');
      setShowReportForm(false);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/10">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <main className="flex-1">
        <div className="py-6 sm:py-10 pb-24 md:pb-10">
          <div className="container mx-auto px-4 max-w-2xl">
            
            {/* Header */}
            <div className="mb-8">
              <button 
                onClick={() => router.push('/profile')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Profile
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
            </div>

            {/* Profile Settings */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={displayName || userProfile?.displayName || ''}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="Your display name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Bio</label>
                    <textarea
                      value={bio || userProfile?.bio || ''}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Support & Help */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Support & Help
                </h2>
                
                {!showReportForm ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowReportForm(true)}
                      className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Report an Issue</p>
                          <p className="text-sm text-muted-foreground">Found a bug or problem? Let us know</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    <a
                      href="mailto:info@truthvote.io"
                      className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Contact Support</p>
                          <p className="text-sm text-muted-foreground">info@truthvote.io</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    
                    <a
                      href="/privacy"
                      className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Privacy Policy</p>
                          <p className="text-sm text-muted-foreground">Learn how we protect your data</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Issue Type</label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      >
                        <option value="bug">Bug Report</option>
                        <option value="feature">Feature Request</option>
                        <option value="content">Content Issue</option>
                        <option value="account">Account Problem</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Describe the Issue</label>
                      <textarea
                        value={reportMessage}
                        onChange={(e) => setReportMessage(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                        placeholder="Please describe the issue in detail..."
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleSubmitReport}
                        disabled={submittingReport || !reportMessage.trim()}
                      >
                        {submittingReport ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          'Submit Report'
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowReportForm(false);
                          setReportMessage('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-500/20">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Danger Zone
                </h2>
                
                {!showDeleteConfirm ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                    >
                      Delete Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-500">Delete your account?</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          This will permanently delete your account and all associated data including:
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                          <li>Your profile information</li>
                          <li>All your votes and predictions</li>
                          <li>Your rank and progress</li>
                          <li>Comments and bookmarks</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Type <span className="font-mono text-red-500">DELETE</span> to confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-red-500/30 bg-background focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                        placeholder="DELETE"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleDeleteAccount}
                        disabled={deleting || deleteConfirmText !== 'DELETE'}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        {deleting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                            Deleting...
                          </>
                        ) : (
                          'Permanently Delete Account'
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* App Info */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>TruthVote v1.0.0</p>
              <p className="mt-1">Made with care for truth seekers</p>
            </div>
            
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
